import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, useNotificationStore } from '@/stores';
import { oauthApi, pluginsApi } from '@/services/api';
import { getErrorMessage, isRecord } from '@/utils/helpers';
import { notifyAuthFilesChanged } from '@/features/authFiles/authFilesEvents';
import { createOAuthAttempts, type OAuthAttempt } from '@/pages/oauthAttempts';
import { validateDevinCallback } from '@/pages/devinOAuth';
import {
  PROVIDERS,
  buildPluginOAuthProviderCards,
  getAuthKey,
  orderProviders,
  resolveCallbackUrl,
  type OAuthProviderCard,
  type PluginOAuthProviderCard,
  type ProviderState,
} from './oauthProviders';

export interface UseOAuthFlowsOptions {
  loadPlugins: boolean;
  successResetMs?: number | null;
}

export interface OAuthFlows {
  providers: OAuthProviderCard[];
  states: Record<string, ProviderState>;
  providerTitle: (provider: OAuthProviderCard) => string;
  providerText: (provider: OAuthProviderCard, suffix: string) => string;
  startAuth: (provider: string) => Promise<void>;
  cancelAuth: (provider: string) => Promise<void>;
  submitCallback: (provider: string) => Promise<void>;
  setCallbackUrl: (provider: string, value: string) => void;
  resetProvider: (provider: string) => void;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!isRecord(error)) return undefined;
  return typeof error.status === 'number' ? error.status : undefined;
}

export function useOAuthFlows({
  loadPlugins,
  successResetMs = null,
}: UseOAuthFlowsOptions): OAuthFlows {
  const { t } = useTranslation();
  const apiBase = useAuthStore((state) => state.apiBase);
  const { showNotification } = useNotificationStore();
  const [states, setStates] = useState<Record<string, ProviderState>>({});
  const [pluginProviders, setPluginProviders] = useState<PluginOAuthProviderCard[]>([]);
  const attempts = useRef(
    createOAuthAttempts({
      setTimeout: (callback, delay) => window.setTimeout(callback, delay),
      clearTimeout: (timer) => window.clearTimeout(timer),
    })
  );

  const clearTimers = useCallback(() => {
    attempts.current.invalidateAll();
  }, []);

  useEffect(() => {
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
    if (!loadPlugins) return;
    let cancelled = false;
    pluginsApi
      .list()
      .then((response) => {
        if (!cancelled)
          setPluginProviders(buildPluginOAuthProviderCards(response.plugins, apiBase));
      })
      .catch(() => {
        if (!cancelled) setPluginProviders([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase, loadPlugins]);

  const providers = useMemo<OAuthProviderCard[]>(
    () => orderProviders([...PROVIDERS, ...pluginProviders]),
    [pluginProviders]
  );

  const providerTitle = useCallback(
    (provider: OAuthProviderCard) =>
      provider.kind === 'plugin'
        ? t('auth_login.plugin_oauth_title', { name: provider.title })
        : t(provider.titleKey),
    [t]
  );

  const providerText = useCallback(
    (provider: OAuthProviderCard, suffix: string) =>
      provider.kind === 'plugin'
        ? t(`auth_login.plugin_${suffix}`, { name: provider.title })
        : t(getAuthKey(provider.id, suffix)),
    [t]
  );

  const providerTextById = (provider: string, suffix: string) => {
    const card = providers.find((item) => item.id === provider);
    return card ? providerText(card, suffix) : t(getAuthKey(provider, suffix));
  };

  const updateProviderState = useCallback((provider: string, next: Partial<ProviderState>) => {
    setStates((prev) => ({
      ...prev,
      [provider]: { ...(prev[provider] ?? {}), ...next },
    }));
  }, []);

  const resetProvider = useCallback((provider: string) => {
    attempts.current.get(provider)?.invalidate();
    setStates((prev) => ({ ...prev, [provider]: {} }));
  }, []);

  const setCallbackUrl = useCallback(
    (provider: string, value: string) => {
      updateProviderState(provider, {
        callbackUrl: value,
        callbackStatus: undefined,
        callbackError: undefined,
      });
    },
    [updateProviderState]
  );

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
    if (successResetMs !== null) {
      resetAttempt.schedule(() => resetProvider(provider), successResetMs);
    }
  };

  const startPolling = (provider: string, state: string, attempt: OAuthAttempt) => {
    attempt.poll(
      () => oauthApi.getAuthStatus(state, attempt.signal),
      (res) => {
        if (res.status === 'ok') {
          completeProviderAuth(provider);
          showNotification(providerTextById(provider, 'oauth_status_success'), 'success');
        } else if (res.status === 'error') {
          if (provider === 'devin') {
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
            `${providerTextById(provider, 'oauth_status_error')} ${res.error || ''}`,
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
        resetProvider(provider);
        showNotification(t('auth_login.devin_oauth_cancelled'), 'success');
        return;
      }
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
        `${providerTextById(provider, 'oauth_start_error')}${message ? ` ${message}` : ''}`,
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

  return {
    providers,
    states,
    providerTitle,
    providerText,
    startAuth,
    cancelAuth,
    submitCallback,
    setCallbackUrl,
    resetProvider,
  };
}
