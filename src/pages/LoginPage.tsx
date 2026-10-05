import { useEffect, useMemo, useState, useCallback } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WarningCircleIcon } from '@phosphor-icons/react';
import { Banner, Button, Checkbox, Input, Loader, SensitiveInput, Text } from '@cloudflare/kumo';
import { BrandMark } from '@/components/layout/MainLayout';
import { Panel } from '@/components/ui/Panel';
import { useAuthStore, useNotificationStore } from '@/stores';
import { detectApiBaseFromLocation, normalizeApiBase } from '@/utils/connection';
import type { ApiError } from '@/types';
import { LegacyBackendError } from '@/services/api/legacyBackendProbe';

type RedirectState = { from?: { pathname?: string } };

function getLocalizedErrorMessage(error: unknown, t: (key: string) => string): string {
  if (error instanceof LegacyBackendError) return t('login.error_legacy_backend');
  const apiError = error as Partial<ApiError>;
  const status = typeof apiError.status === 'number' ? apiError.status : undefined;
  const code = typeof apiError.code === 'string' ? apiError.code : undefined;
  const message =
    error instanceof Error
      ? error.message
      : typeof apiError.message === 'string'
        ? apiError.message
        : typeof error === 'string'
          ? error
          : '';

  const withHttpStatus = (summary: string) => {
    if (!status) {
      return summary;
    }

    const genericAxiosMessage = `Request failed with status code ${status}`;
    const detail = message.trim();
    const backendDetail =
      detail && detail !== genericAxiosMessage
        ? ` (${t('login.error_backend_detail')}: ${detail})`
        : '';

    return `HTTP ${status}: ${summary}${backendDetail}`;
  };

  if (status === 401) {
    return withHttpStatus(t('login.error_unauthorized'));
  }
  if (status === 403) {
    return withHttpStatus(t('login.error_forbidden'));
  }
  if (status === 404) {
    return withHttpStatus(t('login.error_not_found'));
  }
  if (status && status >= 500) {
    return withHttpStatus(t('login.error_server'));
  }

  if (code === 'ECONNABORTED' || message.toLowerCase().includes('timeout')) {
    return t('login.error_timeout');
  }
  if (code === 'ERR_NETWORK' || message.toLowerCase().includes('network error')) {
    return t('login.error_network');
  }
  if (code === 'ERR_CERT_AUTHORITY_INVALID' || message.toLowerCase().includes('certificate')) {
    return t('login.error_ssl');
  }

  if (message.toLowerCase().includes('cors') || message.toLowerCase().includes('cross-origin')) {
    return t('login.error_cors');
  }

  return withHttpStatus(t('login.error_invalid'));
}

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { showNotification } = useNotificationStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const login = useAuthStore((state) => state.login);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const storedBase = useAuthStore((state) => state.apiBase);
  const storedKey = useAuthStore((state) => state.managementKey);
  const storedRememberPassword = useAuthStore((state) => state.rememberPassword);

  const [apiBase, setApiBase] = useState('');
  const [managementKey, setManagementKey] = useState('');
  const [showCustomBase, setShowCustomBase] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(true);
  const [autoLoginSuccess, setAutoLoginSuccess] = useState(false);
  const [error, setError] = useState('');

  const detectedBase = useMemo(() => detectApiBaseFromLocation(), []);

  useEffect(() => {
    const init = async () => {
      try {
        const autoLoggedIn = await restoreSession();
        if (autoLoggedIn) {
          setAutoLoginSuccess(true);
          setTimeout(() => {
            const redirect = (location.state as RedirectState | null)?.from?.pathname || '/';
            navigate(redirect, { replace: true });
          }, 1500);
        } else {
          setApiBase(storedBase || detectedBase);
          setManagementKey(storedKey || '');
          setRememberPassword(storedRememberPassword || Boolean(storedKey));
        }
      } finally {
        setAutoLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!managementKey.trim()) {
      setError(t('login.error_required'));
      return;
    }

    const baseToUse = apiBase ? normalizeApiBase(apiBase) : detectedBase;
    setLoading(true);
    setError('');
    try {
      await login({
        apiBase: baseToUse,
        managementKey: managementKey.trim(),
        rememberPassword,
      });
      showNotification(t('common.connected_status'), 'success');
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const message = getLocalizedErrorMessage(err, t);
      setError(message);
      showNotification(`${t('notification.login_failed')}: ${message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [
    apiBase,
    detectedBase,
    login,
    managementKey,
    navigate,
    rememberPassword,
    showNotification,
    t,
  ]);

  if (isAuthenticated && !autoLoading && !autoLoginSuccess) {
    const redirect = (location.state as RedirectState | null)?.from?.pathname || '/';
    return <Navigate to={redirect} replace />;
  }

  const showSplash = autoLoading || autoLoginSuccess;

  return (
    <div className="flex min-h-dvh items-center justify-center bg-kumo-recessed px-4 py-10">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-center gap-2.5">
          <BrandMark size="lg" />
          <span className="text-xl font-semibold text-kumo-default">{t('login.brand')}</span>
        </div>

        {showSplash ? (
          <Panel className="flex flex-col items-center gap-3 py-10 text-center">
            <Loader size="lg" />
            <Text variant="heading" as="h1">
              {t('login.restoring_title')}
            </Text>
            <Text variant="secondary">{t('login.restoring_subtitle')}</Text>
          </Panel>
        ) : (
          <Panel padding="none">
            <div className="flex flex-col gap-0.5 border-b border-kumo-line p-5">
              <Text variant="heading" as="h1">
                {t('login.title')}
              </Text>
              <Text variant="secondary" size="sm">
                {t('login.subtitle')}
              </Text>
            </div>
            <form
              className="flex flex-col gap-5 p-5"
              onSubmit={(event) => {
                event.preventDefault();
                if (!loading) void handleSubmit();
              }}
            >
              <div className="flex flex-col gap-1 rounded-lg bg-kumo-recessed px-3 py-2.5">
                <span className="text-xs text-kumo-subtle">{t('login.connection_current')}</span>
                <span className="font-mono text-sm break-all text-kumo-default">
                  {apiBase || detectedBase}
                </span>
              </div>

              <Checkbox
                label={t('login.custom_connection_label')}
                checked={showCustomBase}
                onCheckedChange={(checked) => setShowCustomBase(checked === true)}
              />

              {showCustomBase ? (
                <Input
                  label={t('login.custom_connection_input')}
                  placeholder={t('login.custom_connection_placeholder')}
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  description={t('login.custom_connection_hint')}
                />
              ) : null}

              <SensitiveInput
                autoFocus
                label={t('login.management_key_label')}
                placeholder={t('login.management_key_placeholder')}
                name="cpa-management-key"
                autoComplete="current-password"
                value={managementKey}
                onValueChange={setManagementKey}
              />

              <Checkbox
                label={t('login.remember_password_label')}
                checked={rememberPassword}
                onCheckedChange={(checked) => setRememberPassword(checked === true)}
              />

              {error ? (
                <Banner
                  variant="error"
                  icon={<WarningCircleIcon weight="fill" />}
                  title={t('login.error_title')}
                  description={error}
                />
              ) : null}

              <Button variant="primary" type="submit" className="w-full" loading={loading}>
                {loading ? t('login.submitting') : t('login.submit_button')}
              </Button>
            </form>
          </Panel>
        )}
      </div>
    </div>
  );
}
