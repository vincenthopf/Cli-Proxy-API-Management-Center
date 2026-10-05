import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Badge, Banner, ClipboardText, LayerCard, Loader } from '@cloudflare/kumo';
import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  FileArrowUpIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { IconPlug } from '@/components/ui/icons';
import { useAuthStore, useNotificationStore, useThemeStore } from '@/stores';
import { oauthApi, pluginsApi, type BuiltInOAuthProvider } from '@/services/api';
import { vertexApi, type VertexImportResponse } from '@/services/api/vertex';
import { getErrorMessage, isRecord } from '@/utils/helpers';
import { notifyAuthFilesChanged } from '@/features/authFiles/authFilesEvents';
import { getPluginTitle, resolvePluginAssetURL } from '@/features/plugins/pluginResources';
import {
  KIMI_CHINESE_AFFILIATE_URL,
  KIMI_INTERNATIONAL_AFFILIATE_URL,
} from '@/features/providers/kimi';
import type { PluginListEntry } from '@/types';
import { createOAuthAttempts, type OAuthAttempt } from './oauthAttempts';
import { validateDevinCallback } from './devinOAuth';
import { PageHeader } from '@/features/overview/components/PageHeader';
import iconMeta from '@/assets/icons/meta.svg';
import iconCodex from '@/assets/icons/codex.svg';
import iconClaude from '@/assets/icons/claude.svg';
import iconAntigravity from '@/assets/icons/antigravity.svg';
import iconKimiLight from '@/assets/icons/kimi-light.svg';
import iconKimiDark from '@/assets/icons/kimi-dark.svg';
import iconVertex from '@/assets/icons/vertex.svg';
import iconGrok from '@/assets/icons/grok.svg';
import iconGrokDark from '@/assets/icons/grok-dark.svg';
import iconDevin from '@/assets/icons/devin.svg';
import iconDevinDark from '@/assets/icons/devin-dark.svg';

interface ProviderState {
  url?: string;
  userCode?: string;
  state?: string;
  status?: 'idle' | 'waiting' | 'success' | 'error';
  error?: string;
  polling?: boolean;
  cancelling?: boolean;
  cancelError?: string;
  callbackUrl?: string;
  callbackSubmitting?: boolean;
  callbackStatus?: 'success' | 'error';
  callbackError?: string;
}

interface VertexImportResult {
  projectId?: string;
  email?: string;
  location?: string;
  authFile?: string;
}

interface VertexImportState {
  file?: File;
  fileName: string;
  location: string;
  loading: boolean;
  error?: string;
  result?: VertexImportResult;
}

interface BuiltInOAuthProviderCard {
  kind: 'builtin';
  id: BuiltInOAuthProvider;
  titleKey: string;
  icon: string | { light: string; dark: string };
}

interface PluginOAuthProviderCard {
  kind: 'plugin';
  id: string;
  title: string;
  icon: string;
}

type OAuthProviderCard = BuiltInOAuthProviderCard | PluginOAuthProviderCard;

function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

const PROVIDERS: BuiltInOAuthProviderCard[] = [
  {
    kind: 'builtin',
    id: 'meta',
    titleKey: 'auth_login.meta_oauth_title',
    icon: iconMeta,
  },
  {
    kind: 'builtin',
    id: 'kimi',
    titleKey: 'auth_login.kimi_oauth_title',
    icon: { light: iconKimiDark, dark: iconKimiLight },
  },
  {
    kind: 'builtin',
    id: 'kimi-ai',
    titleKey: 'auth_login.kimi_ai_oauth_title',
    icon: { light: iconKimiDark, dark: iconKimiLight },
  },
  {
    kind: 'builtin',
    id: 'codex',
    titleKey: 'auth_login.codex_oauth_title',
    icon: iconCodex,
  },
  {
    kind: 'builtin',
    id: 'anthropic',
    titleKey: 'auth_login.anthropic_oauth_title',
    icon: iconClaude,
  },
  {
    kind: 'builtin',
    id: 'antigravity',
    titleKey: 'auth_login.antigravity_oauth_title',
    icon: iconAntigravity,
  },
  {
    kind: 'builtin',
    id: 'xai',
    titleKey: 'auth_login.xai_oauth_title',
    icon: { light: iconGrok, dark: iconGrokDark },
  },
  {
    kind: 'builtin',
    id: 'devin',
    titleKey: 'auth_login.devin_oauth_title',
    icon: { light: iconDevin, dark: iconDevinDark },
  },
];

const BUILTIN_PROVIDER_IDS = new Set<string>(PROVIDERS.map((provider) => provider.id));
const CALLBACK_SUPPORTED = new Set<string>(['codex', 'anthropic', 'antigravity', 'xai', 'devin']);
const XAI_CALLBACK_URL = 'http://127.0.0.1:56121/callback';
const SUCCESS_RESET_DELAY_MS = 5000;
const getProviderI18nPrefix = (provider: string) => provider.replace('-', '_');
const getAuthKey = (provider: string, suffix: string) =>
  `auth_login.${getProviderI18nPrefix(provider)}_${suffix}`;

const getIcon = (icon: string | { light: string; dark: string }, theme: 'light' | 'dark') => {
  return typeof icon === 'string' ? icon : icon[theme];
};

function PluginOAuthIcon({ src }: { src: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return <img src={src} alt="" className="size-6" onError={() => setFailed(true)} />;
  }
  return (
    <span className="flex size-6 items-center justify-center text-kumo-subtle" aria-hidden="true">
      <IconPlug size={18} />
    </span>
  );
}

function OAuthProviderIcon({
  provider,
  theme,
}: {
  provider: OAuthProviderCard;
  theme: 'light' | 'dark';
}) {
  if (provider.kind === 'plugin') {
    return <PluginOAuthIcon src={provider.icon} />;
  }
  return <img src={getIcon(provider.icon, theme)} alt="" className="size-6" />;
}

const buildPluginOAuthProviderCards = (
  plugins: PluginListEntry[],
  apiBase: string
): PluginOAuthProviderCard[] => {
  const seenProviders = new Set(BUILTIN_PROVIDER_IDS);
  return plugins.flatMap((plugin) => {
    const provider = plugin.oauthProvider;
    if (
      !plugin.supportsOAuth ||
      !plugin.effectiveEnabled ||
      !provider ||
      seenProviders.has(provider)
    ) {
      return [];
    }
    seenProviders.add(provider);
    return [
      {
        kind: 'plugin' as const,
        id: provider,
        title: getPluginTitle(plugin),
        icon: resolvePluginAssetURL(plugin.logo || plugin.metadata?.logo || '', apiBase),
      },
    ];
  });
};

const isAbsoluteUrl = (value: string): boolean => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const readQueryLikeCallbackInput = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const queryStart = trimmed.indexOf('?');
  const hashStart = trimmed.indexOf('#');
  const rawParams =
    queryStart >= 0
      ? trimmed.slice(queryStart + 1)
      : hashStart >= 0
        ? trimmed.slice(hashStart + 1)
        : trimmed;

  if (!/(^|[&#?])(code|state|error)=/i.test(rawParams)) return null;
  return new URLSearchParams(rawParams.replace(/^[?#]/, ''));
};

const extractDisplayedXaiCode = (value: string): string => {
  const trimmed = value.trim();
  const codeMatch = trimmed.match(/\bcode\s*[:=]\s*([^\s&]+)/i);
  return (codeMatch?.[1] ?? trimmed).trim();
};

const buildXaiCallbackUrl = (input: string, state?: string): string | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (isAbsoluteUrl(trimmed)) return trimmed;

  const params = readQueryLikeCallbackInput(trimmed);
  if (params) {
    const code = params.get('code')?.trim();
    const error = params.get('error')?.trim();
    const errorDescription = params.get('error_description')?.trim();
    const callbackState = params.get('state')?.trim() || state?.trim();
    if (!callbackState) return null;

    const callbackUrl = new URL(XAI_CALLBACK_URL);
    callbackUrl.searchParams.set('state', callbackState);
    if (code) callbackUrl.searchParams.set('code', code);
    if (error) callbackUrl.searchParams.set('error', error);
    if (errorDescription) callbackUrl.searchParams.set('error_description', errorDescription);
    return callbackUrl.toString();
  }

  const code = extractDisplayedXaiCode(trimmed);
  const callbackState = state?.trim();
  if (!code || !callbackState) return null;

  const callbackUrl = new URL(XAI_CALLBACK_URL);
  callbackUrl.searchParams.set('code', code);
  callbackUrl.searchParams.set('state', callbackState);
  return callbackUrl.toString();
};

const resolveCallbackUrl = (provider: string, input: string, state?: string): string | null => {
  if (provider !== 'xai') return input.trim();
  return buildXaiCallbackUrl(input, state);
};

export function OAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const apiBase = useAuthStore((state) => state.apiBase);
  const { showNotification } = useNotificationStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const [states, setStates] = useState<Record<string, ProviderState>>({});
  const [pluginProviders, setPluginProviders] = useState<PluginOAuthProviderCard[]>([]);
  const [vertexState, setVertexState] = useState<VertexImportState>({
    fileName: '',
    location: '',
    loading: false,
  });
  const attempts = useRef(
    createOAuthAttempts({
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (timer) => window.clearTimeout(timer),
    })
  );
  const vertexFileInputRef = useRef<HTMLInputElement | null>(null);

  const clearTimers = useCallback(() => {
    attempts.current.invalidateAll();
  }, []);

  useEffect(() => {
    // Invalidate synchronously on connection changes, including a new key on
    // the same server. Never send cleanup requests through the new connection.
    const unsubscribe = useAuthStore.subscribe((current, previous) => {
      if (
        current.apiBase !== previous.apiBase ||
        current.managementKey !== previous.managementKey ||
        current.isAuthenticated !== previous.isAuthenticated
      ) {
        clearTimers();
        setStates({});
      }
    });
    return () => {
      unsubscribe();
      clearTimers();
    };
  }, [clearTimers]);

  useEffect(() => {
    let cancelled = false;

    const loadPluginProviders = async () => {
      try {
        const response = await pluginsApi.list();
        if (!cancelled) {
          setPluginProviders(buildPluginOAuthProviderCards(response.plugins, apiBase));
        }
      } catch {
        if (!cancelled) {
          setPluginProviders([]);
        }
      }
    };

    void loadPluginProviders();

    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  const providerCards = useMemo<OAuthProviderCard[]>(
    () => [...PROVIDERS, ...pluginProviders],
    [pluginProviders]
  );

  const getProviderTitleText = (provider: OAuthProviderCard) =>
    provider.kind === 'plugin'
      ? t('auth_login.plugin_oauth_title', { name: provider.title })
      : t(provider.titleKey);

  const getProviderText = (provider: OAuthProviderCard, suffix: string) =>
    provider.kind === 'plugin'
      ? t(`auth_login.plugin_${suffix}`, { name: provider.title })
      : t(getAuthKey(provider.id, suffix));

  const getProviderTextByID = (provider: string, suffix: string) => {
    const card = providerCards.find((item) => item.id === provider);
    return card ? getProviderText(card, suffix) : t(getAuthKey(provider, suffix));
  };

  const updateProviderState = (provider: string, next: Partial<ProviderState>) => {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] ?? {}), ...next },
    }));
  };

  const resetProviderAttempt = (provider: string) => {
    attempts.current.get(provider)?.invalidate();
    setStates((prev) => {
      return {
        ...prev,
        [provider]: {},
      };
    });
  };

  const completeProviderAuth = (provider: string) => {
    const resetAttempt = attempts.current.begin(provider);
    notifyAuthFilesChanged();
    updateProviderState(provider, {
      url: undefined,
      state: undefined,
      status: 'success',
      error: undefined,
      polling: false,
      cancelling: false,
      cancelError: undefined,
      callbackUrl: '',
      callbackSubmitting: false,
      callbackStatus: undefined,
      callbackError: undefined,
    });
    resetAttempt.schedule(() => {
      resetProviderAttempt(provider);
    }, SUCCESS_RESET_DELAY_MS);
  };

  const startPolling = (provider: string, state: string, attempt: OAuthAttempt) => {
    attempt.poll(
      () => oauthApi.getAuthStatus(state, attempt.signal),
      (res) => {
        if (res.status === 'ok') {
          completeProviderAuth(provider);
          showNotification(getProviderTextByID(provider, 'oauth_status_success'), 'success');
        } else if (res.status === 'error') {
          if (provider === 'devin') {
            // Expired, denied and cancelled states cannot accept another callback.
            attempt.invalidate();
            updateProviderState(provider, {
              url: undefined,
              state: undefined,
              callbackUrl: '',
              callbackSubmitting: false,
              callbackStatus: undefined,
              callbackError: undefined,
            });
          }
          updateProviderState(provider, { status: 'error', error: res.error, polling: false });
          showNotification(
            `${getProviderTextByID(provider, 'oauth_status_error')} ${res.error || ''}`,
            'error'
          );
        }
        return res.status === 'wait';
      },
      (err) => {
        updateProviderState(provider, {
          status: 'error',
          error: getErrorMessage(err),
          polling: false,
        });
      },
      3000
    );
  };

  const cancelAuth = async (provider: string) => {
    const state = states[provider]?.state;
    if (provider !== 'devin' || !state || states[provider]?.cancelling) return;
    // Replace the attempt before DELETE so late polls/callback submissions cannot
    // overwrite the cancellation result or a subsequent login.
    const attempt = attempts.current.begin(provider);
    updateProviderState(provider, {
      cancelling: true,
      cancelError: undefined,
      polling: true,
      callbackSubmitting: false,
      callbackStatus: undefined,
      callbackError: undefined,
    });
    try {
      const result = await oauthApi.cancelSession(state, attempt.signal);
      if (!attempt.isCurrent()) return;
      if (result.cancelled) {
        resetProviderAttempt(provider);
        showNotification(t('auth_login.devin_oauth_cancelled'), 'success');
        return;
      }
      // A completed or expired session returns cancelled=false. Read its real
      // status rather than claiming cancellation or losing a completed login.
    } catch (err: unknown) {
      if (!attempt.isCurrent()) return;
      const message = getErrorMessage(err);
      updateProviderState(provider, { cancelError: message });
      showNotification(`${t('auth_login.devin_oauth_cancel_error')} ${message}`, 'error');
    }
    updateProviderState(provider, {
      cancelling: false,
      status: 'waiting',
      error: undefined,
    });
    startPolling(provider, state, attempt);
  };

  const startAuth = async (provider: string) => {
    // A network error can stop polling while the server is still waiting. Require
    // explicit cancellation before replacing that Devin session.
    if (provider === 'devin' && states[provider]?.state) return;
    const attempt = attempts.current.begin(provider);
    updateProviderState(provider, {
      url: undefined,
      userCode: undefined,
      state: undefined,
      status: 'waiting',
      polling: true,
      cancelling: false,
      cancelError: undefined,
      error: undefined,
      callbackStatus: undefined,
      callbackError: undefined,
      callbackUrl: '',
      callbackSubmitting: false,
    });
    try {
      const res = await oauthApi.startAuth(provider, attempt.signal);
      if (!attempt.isCurrent()) return;
      if (!res.state) {
        const message = t('auth_login.missing_state');
        updateProviderState(provider, {
          url: res.url,
          state: undefined,
          status: 'error',
          error: message,
          polling: false,
        });
        showNotification(message, 'error');
        return;
      }
      updateProviderState(provider, {
        url: res.url,
        userCode: res.user_code,
        state: res.state,
        status: 'waiting',
        polling: true,
      });
      startPolling(provider, res.state, attempt);
    } catch (err: unknown) {
      if (!attempt.isCurrent()) return;
      const message = getErrorMessage(err);
      updateProviderState(provider, { status: 'error', error: message, polling: false });
      showNotification(
        `${getProviderTextByID(provider, 'oauth_start_error')}${message ? ` ${message}` : ''}`,
        'error'
      );
    }
  };

  const submitCallback = async (provider: string) => {
    const attempt = attempts.current.get(provider);
    if (!attempt?.isCurrent()) return;
    if (
      provider === 'devin' &&
      (states[provider]?.cancelling || states[provider]?.status !== 'waiting')
    ) {
      return;
    }
    const callbackInput = (states[provider]?.callbackUrl || '').trim();
    if (!callbackInput) {
      showNotification(
        t(
          provider === 'xai'
            ? 'auth_login.xai_callback_required'
            : 'auth_login.oauth_callback_required'
        ),
        'warning'
      );
      return;
    }
    if (provider === 'devin') {
      const callbackError = validateDevinCallback(callbackInput, states[provider]?.state);
      if (callbackError) {
        showNotification(t(`auth_login.devin_callback_${callbackError}`), 'warning');
        return;
      }
    }
    const redirectUrl = resolveCallbackUrl(provider, callbackInput, states[provider]?.state);
    if (!redirectUrl) {
      showNotification(
        t(
          provider === 'xai' ? 'auth_login.xai_callback_state_missing' : 'auth_login.missing_state'
        ),
        'warning'
      );
      return;
    }
    updateProviderState(provider, {
      callbackSubmitting: true,
      callbackStatus: undefined,
      callbackError: undefined,
    });
    try {
      await oauthApi.submitCallback(provider, redirectUrl, attempt.signal);
      if (!attempt.isCurrent()) return;
      updateProviderState(provider, { callbackSubmitting: false, callbackStatus: 'success' });
      showNotification(t('auth_login.oauth_callback_success'), 'success');
    } catch (err: unknown) {
      if (!attempt.isCurrent()) return;
      const status = getErrorStatus(err);
      const message = getErrorMessage(err);
      const errorMessage =
        status === 404
          ? t('auth_login.oauth_callback_upgrade_hint', {
              defaultValue: 'Please update CLI Proxy API or check the connection.',
            })
          : message || undefined;
      updateProviderState(provider, {
        callbackSubmitting: false,
        callbackStatus: 'error',
        callbackError: errorMessage,
      });
      const notificationMessage = errorMessage
        ? `${t('auth_login.oauth_callback_error')} ${errorMessage}`
        : t('auth_login.oauth_callback_error');
      showNotification(notificationMessage, 'error');
    }
  };

  const handleVertexFilePick = () => {
    vertexFileInputRef.current?.click();
  };

  const handleVertexFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.json')) {
      showNotification(t('vertex_import.file_required'), 'warning');
      event.target.value = '';
      return;
    }
    setVertexState((prev) => ({
      ...prev,
      file,
      fileName: file.name,
      error: undefined,
      result: undefined,
    }));
    event.target.value = '';
  };

  const handleVertexImport = async () => {
    if (!vertexState.file) {
      const message = t('vertex_import.file_required');
      setVertexState((prev) => ({ ...prev, error: message }));
      showNotification(message, 'warning');
      return;
    }
    const location = vertexState.location.trim();
    setVertexState((prev) => ({ ...prev, loading: true, error: undefined, result: undefined }));
    try {
      const res: VertexImportResponse = await vertexApi.importCredential(
        vertexState.file,
        location || undefined
      );
      const result: VertexImportResult = {
        projectId: res.project_id,
        email: res.email,
        location: res.location,
        authFile: res['auth-file'] ?? res.auth_file,
      };
      setVertexState((prev) => ({ ...prev, loading: false, result }));
      notifyAuthFilesChanged();
      showNotification(t('vertex_import.success'), 'success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setVertexState((prev) => ({
        ...prev,
        loading: false,
        error: message || t('notification.upload_failed'),
      }));
      const notification = message
        ? `${t('notification.upload_failed')}: ${message}`
        : t('notification.upload_failed');
      showNotification(notification, 'error');
    }
  };

  const renderStatusBadge = (status: ProviderState['status']) => {
    if (status === 'waiting') {
      return <Badge variant="info">{t('auth_login.oauth_badge_waiting')}</Badge>;
    }
    if (status === 'success') {
      return <Badge variant="success">{t('auth_login.oauth_badge_success')}</Badge>;
    }
    if (status === 'error') {
      return <Badge variant="error">{t('auth_login.oauth_badge_error')}</Badge>;
    }
    return null;
  };

  const renderStatusBanner = (provider: OAuthProviderCard, state: ProviderState) => {
    if (state.status === 'waiting') {
      return (
        <Banner
          size="sm"
          icon={<Loader size="sm" />}
          description={getProviderText(provider, 'oauth_status_waiting')}
        />
      );
    }
    if (state.status === 'success') {
      return (
        <Banner
          size="sm"
          variant="secondary"
          icon={<CheckCircleIcon weight="fill" className="text-kumo-success" />}
          description={getProviderText(provider, 'oauth_status_success')}
          action={
            <Banner.Action variant="secondary" onClick={() => navigate('/auth-files')}>
              {t('auth_login.view_auth_files')}
            </Banner.Action>
          }
        />
      );
    }
    if (state.status === 'error') {
      return (
        <Banner
          size="sm"
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          description={`${getProviderText(provider, 'oauth_status_error')} ${state.error || ''}`.trim()}
        />
      );
    }
    return null;
  };

  const renderOAuthProviderCard = (provider: OAuthProviderCard, featured = false) => {
    const state = states[provider.id] || {};
    const showKimiSignUp =
      featured && provider.kind === 'builtin' && ['kimi', 'kimi-ai'].includes(provider.id);
    const canSubmitCallback =
      (provider.kind === 'plugin' || CALLBACK_SUPPORTED.has(provider.id)) && Boolean(state.url);
    const loginButtonLabel =
      state.status === 'success'
        ? t('auth_login.login_another_account')
        : getProviderText(provider, 'oauth_button');
    const callbackLocked =
      provider.id === 'devin' && (state.cancelling || state.status !== 'waiting');
    const hasStatus = Boolean(state.status && state.status !== 'idle');
    const hasDetails = hasStatus || Boolean(state.url) || Boolean(state.cancelError);
    const titleId = `oauth-provider-${provider.id}`;

    return (
      <li
        key={provider.id}
        className="flex flex-col gap-4 px-4 py-4 sm:px-5"
        aria-labelledby={titleId}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-kumo-elevated ring ring-kumo-hairline">
            <OAuthProviderIcon provider={provider} theme={resolvedTheme} />
          </span>
          <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="m-0 text-base font-semibold text-kumo-default">
                {getProviderTitleText(provider)}
              </h2>
              {renderStatusBadge(state.status)}
            </div>
            <p className="m-0 text-sm text-kumo-subtle">
              {getProviderText(provider, 'oauth_hint')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {showKimiSignUp ? (
              <Button
                variant="secondary"
                onClick={() =>
                  window.open(
                    provider.id === 'kimi-ai'
                      ? KIMI_INTERNATIONAL_AFFILIATE_URL
                      : KIMI_CHINESE_AFFILIATE_URL,
                    '_blank',
                    'noopener,noreferrer'
                  )
                }
              >
                {t('auth_login.kimi_sign_up_button')}
              </Button>
            ) : null}
            <Button
              variant={state.status === 'success' ? 'secondary' : 'primary'}
              onClick={() => startAuth(provider.id)}
              loading={state.polling}
              disabled={provider.id === 'devin' && Boolean(state.state)}
            >
              {loginButtonLabel}
            </Button>
          </div>
        </div>

        {hasDetails && (
          <div className="flex flex-col gap-4 rounded-lg bg-kumo-elevated p-4 ring ring-kumo-hairline sm:ml-14">
            {renderStatusBanner(provider, state)}
            {state.url && (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium text-kumo-default">
                    {getProviderText(provider, 'oauth_url_label')}
                  </span>
                  <ClipboardText
                    text={state.url}
                    size="base"
                    tooltip={{
                      text: getProviderText(provider, 'copy_link'),
                      copiedText: t('notification.link_copied'),
                    }}
                    labels={{ copyAction: getProviderText(provider, 'copy_link') }}
                  />
                </div>
                {state.userCode && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium text-kumo-default">
                      {t('auth_login.device_code_label')}
                    </span>
                    <ClipboardText
                      text={state.userCode}
                      size="lg"
                      className="max-w-xs font-mono tracking-widest"
                      tooltip={{
                        text: t('auth_login.device_code_copy'),
                        copiedText: t('auth_login.device_code_copied'),
                      }}
                      labels={{ copyAction: t('auth_login.device_code_copy') }}
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => window.open(state.url, '_blank', 'noopener,noreferrer')}
                  >
                    <ArrowSquareOutIcon size={14} />
                    {getProviderText(provider, 'open_link')}
                  </Button>
                  {provider.id === 'devin' && state.state && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => cancelAuth(provider.id)}
                      loading={state.cancelling}
                    >
                      {t('auth_login.devin_oauth_cancel')}
                    </Button>
                  )}
                </div>
                {provider.id === 'devin' && state.state && state.status === 'error' && (
                  <p className="m-0 text-sm text-kumo-subtle">
                    {t('auth_login.devin_oauth_retry_hint')}
                  </p>
                )}
              </div>
            )}
            {state.cancelError && (
              <Banner
                size="sm"
                variant="error"
                icon={<WarningCircleIcon weight="fill" />}
                description={`${t('auth_login.devin_oauth_cancel_error')} ${state.cancelError}`}
              />
            )}
            {canSubmitCallback && (
              <div className="flex flex-col gap-2 border-t border-kumo-hairline pt-4">
                <Input
                  label={t(
                    provider.id === 'xai'
                      ? 'auth_login.xai_callback_label'
                      : 'auth_login.oauth_callback_label'
                  )}
                  hint={t(
                    provider.id === 'xai'
                      ? 'auth_login.xai_callback_hint'
                      : provider.id === 'devin'
                        ? 'auth_login.devin_callback_hint'
                        : 'auth_login.oauth_callback_hint'
                  )}
                  disabled={callbackLocked}
                  value={state.callbackUrl || ''}
                  onChange={(e) =>
                    updateProviderState(provider.id, {
                      callbackUrl: e.target.value,
                      callbackStatus: undefined,
                      callbackError: undefined,
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !callbackLocked && !state.callbackSubmitting) {
                      event.preventDefault();
                      void submitCallback(provider.id);
                    }
                  }}
                  placeholder={t(
                    provider.id === 'xai'
                      ? 'auth_login.xai_callback_placeholder'
                      : provider.id === 'devin'
                        ? 'auth_login.devin_callback_placeholder'
                        : 'auth_login.oauth_callback_placeholder'
                  )}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => submitCallback(provider.id)}
                    loading={state.callbackSubmitting}
                    disabled={callbackLocked}
                  >
                    {t('auth_login.oauth_callback_button')}
                  </Button>
                </div>
                {state.callbackStatus === 'success' && state.status === 'waiting' && (
                  <Banner
                    size="sm"
                    variant="secondary"
                    icon={<CheckCircleIcon weight="fill" className="text-kumo-success" />}
                    description={t('auth_login.oauth_callback_status_success')}
                  />
                )}
                {state.callbackStatus === 'error' && (
                  <Banner
                    size="sm"
                    variant="error"
                    icon={<WarningCircleIcon weight="fill" />}
                    description={`${t('auth_login.oauth_callback_status_error')} ${state.callbackError || ''}`.trim()}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </li>
    );
  };

  const PRIMARY_ORDER = ['anthropic', 'claude', 'codex'];
  const orderedProviders = [...providerCards].sort((left, right) => {
    const l = PRIMARY_ORDER.indexOf(left.id);
    const r = PRIMARY_ORDER.indexOf(right.id);
    return (l === -1 ? 99 : l) - (r === -1 ? 99 : r);
  });

  return (
    <div className="flex w-full flex-col gap-8">
      <PageHeader title={t('nav.add_account')} description={t('auth_login.page_description')} />

      <section className="flex flex-col gap-3" aria-label={t('auth_login.oauth_section_title')}>
        <LayerCard>
          <ul className="m-0 flex list-none flex-col divide-y divide-kumo-hairline p-0">
            {orderedProviders.map((provider) => renderOAuthProviderCard(provider))}
          </ul>
        </LayerCard>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="m-0 text-base font-semibold text-kumo-default">
          {t('auth_login.other_login_methods')}
        </h2>
        <LayerCard className="flex flex-col gap-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-kumo-elevated ring ring-kumo-hairline">
              <img src={iconVertex} alt="" className="size-6" />
            </span>
            <div className="flex min-w-0 flex-1 basis-64 flex-col gap-0.5">
              <h3 className="m-0 text-base font-semibold text-kumo-default">
                {t('vertex_import.title')}
              </h3>
              <p className="m-0 text-sm text-kumo-subtle">{t('vertex_import.description')}</p>
            </div>
            <Button onClick={handleVertexImport} loading={vertexState.loading}>
              {t('vertex_import.import_button')}
            </Button>
          </div>

          <div className="grid gap-4 sm:ml-14 md:grid-cols-2">
            <Input
              label={t('vertex_import.location_label')}
              hint={t('vertex_import.location_hint')}
              value={vertexState.location}
              onChange={(e) =>
                setVertexState((prev) => ({
                  ...prev,
                  location: e.target.value,
                }))
              }
              placeholder={t('vertex_import.location_placeholder')}
            />
            <div className="flex flex-col gap-1.5">
              <span id="vertex-file-label" className="text-base font-medium text-kumo-default">
                {t('vertex_import.file_label')}
              </span>
              <div className="flex min-h-9 items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleVertexFilePick}
                  aria-describedby="vertex-file-label vertex-file-name"
                >
                  <FileArrowUpIcon size={16} />
                  {t('vertex_import.choose_file')}
                </Button>
                <span
                  id="vertex-file-name"
                  className={[
                    'min-w-0 truncate text-sm',
                    vertexState.fileName ? 'font-mono text-kumo-default' : 'text-kumo-subtle',
                  ].join(' ')}
                >
                  {vertexState.fileName || t('vertex_import.file_placeholder')}
                </span>
              </div>
              <span className="text-sm text-kumo-subtle">{t('vertex_import.file_hint')}</span>
              <input
                ref={vertexFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleVertexFileChange}
              />
            </div>
          </div>

          {vertexState.error && (
            <Banner
              size="sm"
              variant="error"
              icon={<WarningCircleIcon weight="fill" />}
              description={vertexState.error}
              className="sm:ml-14"
            />
          )}
          {vertexState.result && (
            <div className="flex flex-col gap-3 rounded-lg bg-kumo-elevated p-4 ring ring-kumo-hairline sm:ml-14">
              <div className="flex items-center gap-2">
                <CheckCircleIcon weight="fill" className="text-kumo-success" />
                <span className="text-sm font-semibold text-kumo-default">
                  {t('vertex_import.result_title')}
                </span>
              </div>
              <dl className="m-0 grid grid-cols-[minmax(0,10rem)_1fr] gap-x-4 gap-y-2 text-sm">
                {(
                  [
                    ['vertex_import.result_project', vertexState.result.projectId],
                    ['vertex_import.result_email', vertexState.result.email],
                    ['vertex_import.result_location', vertexState.result.location],
                    ['vertex_import.result_file', vertexState.result.authFile],
                  ] as const
                )
                  .filter(([, value]) => Boolean(value))
                  .map(([labelKey, value]) => (
                    <div key={labelKey} className="contents">
                      <dt className="text-kumo-subtle">{t(labelKey)}</dt>
                      <dd className="m-0 min-w-0 font-mono break-all text-kumo-default">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          )}
        </LayerCard>
      </section>
    </div>
  );
}
