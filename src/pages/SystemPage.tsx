import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Banner, Loader } from '@cloudflare/kumo';
import { Panel, PanelEmpty } from '@/components/ui/Panel';
import { CubeIcon, WarningCircleIcon, WarningIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IconGithub, IconBookOpen, IconExternalLink, IconCode } from '@/components/ui/icons';
import {
  useAuthStore,
  useConfigStore,
  useNotificationStore,
  useModelsStore,
  useThemeStore,
} from '@/stores';
import { configApi, versionApi } from '@/services/api';
import { useApiKeysForModels } from '@/hooks/useApiKeysForModels';
import { formatDateTimeValue } from '@/utils/format';
import { classifyModels } from '@/utils/models';
import { STORAGE_KEY_AUTH } from '@/utils/constants';
import { INLINE_LOGO_JPEG } from '@/assets/logoInline';
import iconGemini from '@/assets/icons/gemini.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconMeta from '@/assets/icons/meta.svg';
import iconDevinLight from '@/assets/icons/devin.svg';
import iconDevinDark from '@/assets/icons/devin-dark.svg';
import iconOpenaiLight from '@/assets/icons/openai-light.svg';
import iconOpenaiDark from '@/assets/icons/openai-dark.svg';
import iconQwen from '@/assets/icons/qwen.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconGlm from '@/assets/icons/glm.svg';
import iconGrok from '@/assets/icons/grok.svg';
import iconGrokDark from '@/assets/icons/grok-dark.svg';
import iconDeepseek from '@/assets/icons/deepseek.svg';
import iconMinimax from '@/assets/icons/minimax.svg';
import { PageHeader } from '@/features/overview/components/PageHeader';

const MODEL_CATEGORY_ICONS: Record<string, string | { light: string; dark: string }> = {
  devin: { light: iconDevinLight, dark: iconDevinDark },
  gpt: { light: iconOpenaiLight, dark: iconOpenaiDark },
  claude: iconClaude,
  meta: iconMeta,
  gemini: iconGemini,
  qwen: iconQwen,
  kimi: { light: iconKimiDark, dark: iconKimiLight },
  glm: iconGlm,
  grok: { light: iconGrok, dark: iconGrokDark },
  deepseek: iconDeepseek,
  minimax: iconMinimax,
};

const parseVersionSegments = (version?: string | null) => {
  if (!version) return null;
  const cleaned = version.trim().replace(/^v/i, '');
  if (!cleaned) return null;
  const parts = cleaned
    .split(/[^0-9]+/)
    .filter(Boolean)
    .map((segment) => Number.parseInt(segment, 10))
    .filter(Number.isFinite);
  return parts.length ? parts : null;
};

const compareVersions = (latest?: string | null, current?: string | null) => {
  const latestParts = parseVersionSegments(latest);
  const currentParts = parseVersionSegments(current);
  if (!latestParts || !currentParts) return null;
  const length = Math.max(latestParts.length, currentParts.length);
  for (let i = 0; i < length; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return 1;
    if (l < c) return -1;
  }
  return 0;
};

export function SystemPage() {
  const { t, i18n } = useTranslation();
  const { showNotification, showConfirmation } = useNotificationStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const auth = useAuthStore();
  const config = useConfigStore((state) => state.config);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const clearCache = useConfigStore((state) => state.clearCache);
  const updateConfigValue = useConfigStore((state) => state.updateConfigValue);

  const models = useModelsStore((state) => state.models);
  const modelsLoading = useModelsStore((state) => state.loading);
  const modelsError = useModelsStore((state) => state.error);
  const fetchModelsFromStore = useModelsStore((state) => state.fetchModels);

  const [modelStatus, setModelStatus] = useState<{
    type: 'success' | 'warning' | 'error' | 'muted';
    message: string;
  }>();
  const [requestLogModalOpen, setRequestLogModalOpen] = useState(false);
  const [requestLogDraft, setRequestLogDraft] = useState(false);
  const [requestLogTouched, setRequestLogTouched] = useState(false);
  const [requestLogSaving, setRequestLogSaving] = useState(false);
  const [checkingVersion, setCheckingVersion] = useState(false);

  const versionTapCount = useRef(0);
  const versionTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const otherLabel = useMemo(
    () => (i18n.language?.toLowerCase().startsWith('zh') ? '其他' : 'Other'),
    [i18n.language]
  );
  const groupedModels = useMemo(() => classifyModels(models, { otherLabel }), [models, otherLabel]);
  const requestLogEnabled = config?.requestLog ?? false;
  const requestLogDirty = requestLogDraft !== requestLogEnabled;
  const canEditRequestLog = auth.connectionStatus === 'connected' && Boolean(config);

  const appVersion = __APP_VERSION__ || t('system_info.version_unknown');
  const apiVersion = auth.serverVersion || t('system_info.version_unknown');
  const buildTime =
    formatDateTimeValue(auth.serverBuildDate, i18n.language) || t('system_info.version_unknown');

  const getIconForCategory = (categoryId: string): string | null => {
    const iconEntry = MODEL_CATEGORY_ICONS[categoryId];
    if (!iconEntry) return null;
    if (typeof iconEntry === 'string') return iconEntry;
    return resolvedTheme === 'dark' ? iconEntry.dark : iconEntry.light;
  };

  const resolveApiKeysForModels = useApiKeysForModels();

  const fetchModels = async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
    if (auth.connectionStatus !== 'connected') {
      setModelStatus({
        type: 'warning',
        message: t('notification.connection_required'),
      });
      return;
    }

    if (!auth.apiBase) {
      showNotification(t('notification.connection_required'), 'warning');
      return;
    }

    setModelStatus({ type: 'muted', message: t('system_info.models_loading') });
    try {
      const apiKeys = await resolveApiKeysForModels({ force: forceRefresh });
      const primaryKey = apiKeys[0];
      const list = await fetchModelsFromStore(auth.apiBase, primaryKey, forceRefresh);
      const hasModels = list.length > 0;
      setModelStatus({
        type: hasModels ? 'success' : 'warning',
        message: hasModels
          ? t('system_info.models_count', { count: list.length })
          : t('system_info.models_empty'),
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
      const suffix = message ? `: ${message}` : '';
      const text = `${t('system_info.models_error')}${suffix}`;
      setModelStatus({ type: 'error', message: text });
    }
  };

  const handleClearLoginStorage = () => {
    showConfirmation({
      title: t('system_info.clear_login_title', { defaultValue: 'Clear Login Storage' }),
      message: t('system_info.clear_login_confirm'),
      variant: 'danger',
      confirmText: t('common.confirm'),
      onConfirm: () => {
        auth.logout();
        if (typeof localStorage === 'undefined') return;
        const keysToRemove = [STORAGE_KEY_AUTH, 'isLoggedIn', 'apiBase', 'apiUrl', 'managementKey'];
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        showNotification(t('notification.login_storage_cleared'), 'success');
      },
    });
  };

  const openRequestLogModal = useCallback(() => {
    setRequestLogTouched(false);
    setRequestLogDraft(requestLogEnabled);
    setRequestLogModalOpen(true);
  }, [requestLogEnabled]);

  const handleInfoVersionTap = useCallback(() => {
    versionTapCount.current += 1;
    if (versionTapTimer.current) {
      clearTimeout(versionTapTimer.current);
    }

    if (versionTapCount.current >= 7) {
      versionTapCount.current = 0;
      versionTapTimer.current = null;
      openRequestLogModal();
      return;
    }

    versionTapTimer.current = setTimeout(() => {
      versionTapCount.current = 0;
      versionTapTimer.current = null;
    }, 1500);
  }, [openRequestLogModal]);

  const handleRequestLogClose = useCallback(() => {
    setRequestLogModalOpen(false);
    setRequestLogTouched(false);
  }, []);

  const handleRequestLogSave = async () => {
    if (!canEditRequestLog) return;
    if (!requestLogDirty) {
      setRequestLogModalOpen(false);
      return;
    }

    const previous = requestLogEnabled;
    setRequestLogSaving(true);
    updateConfigValue('request-log', requestLogDraft);

    try {
      await configApi.updateRequestLog(requestLogDraft);
      clearCache('request-log');
      showNotification(t('notification.request_log_updated'), 'success');
      setRequestLogModalOpen(false);
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : '';
      updateConfigValue('request-log', previous);
      showNotification(
        `${t('notification.update_failed')}${message ? `: ${message}` : ''}`,
        'error'
      );
    } finally {
      setRequestLogSaving(false);
    }
  };

  const handleVersionCheck = useCallback(async () => {
    setCheckingVersion(true);
    try {
      const data = await versionApi.checkLatest();
      const latestRaw = data?.['latest-version'] ?? data?.latest_version ?? data?.latest ?? '';
      const latest = typeof latestRaw === 'string' ? latestRaw : String(latestRaw ?? '');
      const comparison = compareVersions(latest, auth.serverVersion);

      if (!latest) {
        showNotification(t('system_info.version_check_error'), 'error');
        return;
      }

      if (comparison === null) {
        showNotification(t('system_info.version_current_missing'), 'warning');
        return;
      }

      if (comparison > 0) {
        showNotification(t('system_info.version_update_available', { version: latest }), 'warning');
      } else {
        showNotification(t('system_info.version_is_latest'), 'success');
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : '';
      const suffix = message ? `: ${message}` : '';
      showNotification(`${t('system_info.version_check_error')}${suffix}`, 'error');
    } finally {
      setCheckingVersion(false);
    }
  }, [auth.serverVersion, showNotification, t]);

  useEffect(() => {
    fetchConfig().catch(() => {
      // ignore
    });
  }, [fetchConfig]);

  useEffect(() => {
    if (requestLogModalOpen && !requestLogTouched) {
      setRequestLogDraft(requestLogEnabled);
    }
  }, [requestLogModalOpen, requestLogTouched, requestLogEnabled]);

  useEffect(() => {
    return () => {
      if (versionTapTimer.current) {
        clearTimeout(versionTapTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    fetchModels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.connectionStatus, auth.apiBase]);

  const connectionBadgeVariant =
    auth.connectionStatus === 'connected'
      ? 'success'
      : auth.connectionStatus === 'error'
        ? 'error'
        : auth.connectionStatus === 'connecting'
          ? 'warning'
          : 'neutral';
  const modelBadgeVariant =
    modelStatus?.type === 'success'
      ? 'success'
      : modelStatus?.type === 'warning'
        ? 'warning'
        : modelStatus?.type === 'error'
          ? 'error'
          : 'neutral';
  const quickLinks = [
    {
      href: 'https://github.com/router-for-me/CLIProxyAPI',
      icon: <IconGithub size={18} />,
      title: t('system_info.link_main_repo'),
      description: t('system_info.link_main_repo_desc'),
    },
    {
      href: 'https://github.com/router-for-me/Cli-Proxy-API-Management-Center',
      icon: <IconCode size={18} />,
      title: t('system_info.link_webui_repo'),
      description: t('system_info.link_webui_repo_desc'),
    },
    {
      href: 'https://help.router-for.me/',
      icon: <IconBookOpen size={18} />,
      title: t('system_info.link_docs'),
      description: t('system_info.link_docs_desc'),
    },
  ];
  const sectionTitleClass = 'm-0 text-base font-semibold text-kumo-strong';
  const tileClass = 'flex min-w-0 flex-col gap-1 bg-kumo-base p-4';
  const tileLabelClass = 'text-xs font-medium text-kumo-subtle';
  const tileValueClass = 'truncate text-base font-semibold text-kumo-default tabular-nums';

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader title={t('system_info.title')} />

      <section className="flex flex-col gap-3" aria-labelledby="system-about-title">
        <div className="flex items-center gap-3">
          <img src={INLINE_LOGO_JPEG} alt="CPAMC" className="size-8 rounded-lg" />
          <h2 id="system-about-title" className={sectionTitleClass}>
            {t('system_info.about_title')}
          </h2>
        </div>
        <Panel padding="none" className="overflow-hidden">
          <div className="grid gap-px bg-kumo-line sm:grid-cols-2 xl:grid-cols-4">
            <button
              type="button"
              className={`${tileClass} cursor-default text-left focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none focus-visible:ring-inset`}
              onClick={handleInfoVersionTap}
            >
              <span className={tileLabelClass}>{t('footer.version')}</span>
              <span className={tileValueClass}>{appVersion}</span>
            </button>

            <div className={tileClass}>
              <div className="flex items-center justify-between gap-2">
                <span className={tileLabelClass}>{t('footer.api_version')}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void handleVersionCheck()}
                  loading={checkingVersion}
                  className="-my-1"
                >
                  {t('system_info.version_check_button')}
                </Button>
              </div>
              <span className={tileValueClass}>{apiVersion}</span>
            </div>

            <div className={tileClass}>
              <span className={tileLabelClass}>{t('footer.build_date')}</span>
              <span className={tileValueClass}>{buildTime}</span>
            </div>

            <div className={tileClass}>
              <span className={tileLabelClass}>{t('connection.status')}</span>
              <span>
                <Badge variant={connectionBadgeVariant} appearance="dot">
                  {t(`common.${auth.connectionStatus}_status`)}
                </Badge>
              </span>
              <span
                className="truncate font-mono text-xs text-kumo-subtle"
                title={auth.apiBase || undefined}
              >
                {auth.apiBase || '-'}
              </span>
            </div>
          </div>
        </Panel>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="system-links-title">
        <div className="flex flex-col gap-1">
          <h2 id="system-links-title" className={sectionTitleClass}>
            {t('system_info.quick_links_title')}
          </h2>
          <p className="m-0 text-sm text-kumo-subtle">{t('system_info.quick_links_desc')}</p>
        </div>
        <Panel padding="none" className="overflow-hidden">
          <ul className="m-0 flex list-none flex-col divide-y divide-kumo-line p-0">
            {quickLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 px-4 py-3 no-underline hover:bg-kumo-tint focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none focus-visible:ring-inset sm:px-5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-kumo-recessed text-kumo-default">
                    {link.icon}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-base font-medium text-kumo-default">{link.title}</span>
                    <span className="text-sm text-kumo-subtle">{link.description}</span>
                  </span>
                  <IconExternalLink size={14} className="shrink-0 text-kumo-subtle" />
                </a>
              </li>
            ))}
          </ul>
        </Panel>
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="system-models-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id="system-models-title" className={sectionTitleClass}>
                {t('system_info.models_title')}
              </h2>
              {modelStatus && <Badge variant={modelBadgeVariant}>{modelStatus.message}</Badge>}
            </div>
            <p className="m-0 text-sm text-kumo-subtle">{t('system_info.models_desc')}</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => fetchModels({ forceRefresh: true })}
            loading={modelsLoading}
          >
            {t('common.refresh')}
          </Button>
        </div>
        {modelsError && (
          <Banner
            size="sm"
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            description={modelsError}
          />
        )}
        {modelsLoading ? (
          <Panel padding="sm" className="flex items-center gap-2 text-sm text-kumo-default">
            <Loader size="sm" />
            {t('common.loading')}
          </Panel>
        ) : models.length === 0 ? (
          <Panel padding="none">
            <PanelEmpty
              icon={<CubeIcon size={32} className="text-kumo-inactive" />}
              title={t('system_info.models_empty')}
            />
          </Panel>
        ) : (
          <Panel padding="none">
            <ul className="m-0 flex list-none flex-col divide-y divide-kumo-line p-0">
              {groupedModels.map((group) => {
                const iconSrc = getIconForCategory(group.id);
                return (
                  <li
                    key={group.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:px-5"
                  >
                    <div className="flex shrink-0 items-center gap-3 sm:w-48">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-kumo-recessed">
                        {iconSrc ? <img src={iconSrc} alt="" className="size-5" /> : null}
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-base font-medium text-kumo-default">
                          {group.label}
                        </span>
                        <span className="text-xs text-kumo-subtle">
                          {t('system_info.models_count', { count: group.items.length })}
                        </span>
                      </span>
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
                      {group.items.map((model) => (
                        <span
                          key={`${model.name}-${model.alias ?? 'default'}`}
                          className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-kumo-recessed px-2 py-0.5 font-mono text-xs text-kumo-default ring ring-kumo-hairline"
                          title={model.description || ''}
                        >
                          <span className="truncate">{model.name}</span>
                          {model.alias && <span className="text-kumo-subtle">{model.alias}</span>}
                        </span>
                      ))}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>
        )}
      </section>

      <section className="flex flex-col gap-3" aria-labelledby="system-clear-login-title">
        <Panel className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 basis-72 flex-col gap-1">
            <h2 id="system-clear-login-title" className={sectionTitleClass}>
              {t('system_info.clear_login_title')}
            </h2>
            <p className="m-0 text-sm text-kumo-subtle">{t('system_info.clear_login_desc')}</p>
          </div>
          <Button variant="danger" onClick={handleClearLoginStorage}>
            {t('system_info.clear_login_button')}
          </Button>
        </Panel>
      </section>

      <Modal
        open={requestLogModalOpen}
        onClose={handleRequestLogClose}
        title={t('basic_settings.request_log_title')}
        footer={
          <>
            <Button variant="secondary" onClick={handleRequestLogClose} disabled={requestLogSaving}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleRequestLogSave}
              loading={requestLogSaving}
              disabled={!canEditRequestLog || !requestLogDirty}
            >
              {t('common.save')}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <Banner
            size="sm"
            variant="alert"
            icon={<WarningIcon weight="fill" />}
            description={t('basic_settings.request_log_warning')}
          />
          <ToggleSwitch
            label={t('basic_settings.request_log_enable')}
            labelPosition="left"
            checked={requestLogDraft}
            disabled={!canEditRequestLog || requestLogSaving}
            onChange={(value) => {
              setRequestLogDraft(value);
              setRequestLogTouched(true);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
