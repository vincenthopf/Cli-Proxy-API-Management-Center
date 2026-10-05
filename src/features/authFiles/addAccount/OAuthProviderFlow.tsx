import { useTranslation } from 'react-i18next';
import { Button, ClipboardText, Input, Loader, Text } from '@cloudflare/kumo';
import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  CheckCircleIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  KIMI_CHINESE_AFFILIATE_URL,
  KIMI_INTERNATIONAL_AFFILIATE_URL,
} from '@/features/providers/kimi';
import {
  KIMI_PROVIDER_IDS,
  supportsCallback,
  type OAuthProviderCard,
  type ProviderState,
} from './oauthProviders';
import type { OAuthFlows } from './useOAuthFlows';

export type OAuthFlowActions = Pick<
  OAuthFlows,
  'providerText' | 'startAuth' | 'cancelAuth' | 'submitCallback' | 'setCallbackUrl'
>;

export interface OAuthProviderFlowProps {
  provider: OAuthProviderCard;
  state: ProviderState;
  actions: OAuthFlowActions;
  accountName: string | null;
  onDone: () => void;
}

const openExternal = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

function StepHeading({ index, children }: { index: number; children: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full bg-kumo-recessed text-xs font-semibold text-kumo-default tabular-nums"
      >
        {index}
      </span>
      <span className="text-sm font-medium text-kumo-default">{children}</span>
    </div>
  );
}

function InlineError({ children }: { children: string }) {
  return (
    <p role="alert" className="m-0 flex items-start gap-2 text-sm text-kumo-danger">
      <WarningCircleIcon weight="fill" size={16} className="mt-0.5 shrink-0" />
      <span className="min-w-0 break-words">{children}</span>
    </p>
  );
}

export function OAuthProviderFlow({
  provider,
  state,
  actions,
  accountName,
  onDone,
}: OAuthProviderFlowProps) {
  const { t } = useTranslation();
  const { providerText, startAuth, cancelAuth, submitCallback, setCallbackUrl } = actions;
  const status = state.status ?? 'idle';
  const isDevin = provider.id === 'devin';
  const devinSessionOpen = isDevin && Boolean(state.state);
  const canSubmitCallback = supportsCallback(provider) && Boolean(state.url);
  const callbackLocked = isDevin && (state.cancelling || status !== 'waiting');
  const showKimiSignUp = provider.kind === 'builtin' && KIMI_PROVIDER_IDS.has(provider.id);
  const isXai = provider.id === 'xai';
  const kimiSignUp = showKimiSignUp ? (
    <Button
      variant="secondary"
      onClick={() =>
        openExternal(
          provider.id === 'kimi-ai' ? KIMI_INTERNATIONAL_AFFILIATE_URL : KIMI_CHINESE_AFFILIATE_URL
        )
      }
    >
      {t('auth_login.kimi_sign_up_button')}
    </Button>
  ) : null;

  if (status === 'success') {
    return (
      <div className="flex flex-col items-start gap-4" role="status">
        <div className="flex items-start gap-3">
          <CheckCircleIcon weight="fill" size={28} className="shrink-0 text-kumo-success" />
          <div className="flex min-w-0 flex-col gap-1">
            <Text variant="heading" as="h3">
              {t('add_account.success_title')}
            </Text>
            <p className="m-0 text-sm break-all text-kumo-subtle">
              {accountName
                ? t('add_account.success_named', { name: accountName })
                : t('add_account.success_unnamed')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={onDone}>
            {t('add_account.done')}
          </Button>
          <Button variant="secondary" onClick={() => void startAuth(provider.id)}>
            {t('add_account.add_another')}
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void startAuth(provider.id)}>
            {providerText(provider, 'oauth_button')}
          </Button>
          {kimiSignUp}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-start gap-4">
        <div className="flex flex-col gap-1">
          <Text variant="heading" as="h3">
            {t('add_account.error_title')}
          </Text>
          <InlineError>
            {`${providerText(provider, 'oauth_status_error')} ${state.error || ''}`.trim()}
          </InlineError>
        </div>
        {devinSessionOpen ? (
          <p className="m-0 text-sm text-kumo-subtle">{t('auth_login.devin_oauth_retry_hint')}</p>
        ) : null}
        {state.cancelError ? (
          <InlineError>{`${t('auth_login.devin_oauth_cancel_error')} ${state.cancelError}`}</InlineError>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {devinSessionOpen ? (
            <Button
              variant="primary"
              loading={state.cancelling}
              onClick={() => void cancelAuth(provider.id)}
            >
              {t('auth_login.devin_oauth_cancel')}
            </Button>
          ) : (
            <Button
              variant="primary"
              icon={ArrowClockwiseIcon}
              onClick={() => void startAuth(provider.id)}
            >
              {t('add_account.retry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!state.url) {
    return (
      <div className="flex items-center gap-3 py-2 text-sm text-kumo-subtle" role="status">
        <Loader size="sm" />
        {t('add_account.preparing')}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-3">
        <StepHeading index={1}>{t('add_account.step_open')}</StepHeading>
        <div className="flex flex-col gap-3 pl-7">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="primary"
              icon={ArrowSquareOutIcon}
              onClick={() => state.url && openExternal(state.url)}
            >
              {t('add_account.open_sign_in')}
            </Button>
            {kimiSignUp}
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs text-kumo-subtle">{t('add_account.link_hint')}</span>
            <ClipboardText
              text={state.url}
              size="sm"
              tooltip={{
                text: providerText(provider, 'copy_link'),
                copiedText: t('notification.link_copied'),
              }}
              labels={{ copyAction: providerText(provider, 'copy_link') }}
            />
          </div>
          {state.userCode ? (
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-kumo-subtle">{t('auth_login.device_code_label')}</span>
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
          ) : null}
        </div>
      </section>

      {canSubmitCallback ? (
        <section className="flex flex-col gap-3">
          <StepHeading index={2}>{t('add_account.step_callback')}</StepHeading>
          <div className="flex flex-col gap-2 pl-7">
            <Input
              label={t(isXai ? 'auth_login.xai_callback_label' : 'auth_login.oauth_callback_label')}
              description={t(
                isXai
                  ? 'auth_login.xai_callback_hint'
                  : isDevin
                    ? 'auth_login.devin_callback_hint'
                    : 'auth_login.oauth_callback_hint'
              )}
              disabled={callbackLocked}
              value={state.callbackUrl || ''}
              onChange={(event) => setCallbackUrl(provider.id, event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !callbackLocked && !state.callbackSubmitting) {
                  event.preventDefault();
                  void submitCallback(provider.id);
                }
              }}
              placeholder={t(
                isXai
                  ? 'auth_login.xai_callback_placeholder'
                  : isDevin
                    ? 'auth_login.devin_callback_placeholder'
                    : 'auth_login.oauth_callback_placeholder'
              )}
            />
            <div>
              <Button
                variant="secondary"
                size="sm"
                loading={state.callbackSubmitting}
                disabled={callbackLocked}
                onClick={() => void submitCallback(provider.id)}
              >
                {t('auth_login.oauth_callback_button')}
              </Button>
            </div>
            {state.callbackStatus === 'success' ? (
              <p className="m-0 flex items-center gap-2 text-sm text-kumo-default">
                <CheckCircleIcon weight="fill" size={16} className="text-kumo-success" />
                {t('auth_login.oauth_callback_status_success')}
              </p>
            ) : null}
            {state.callbackStatus === 'error' ? (
              <InlineError>
                {`${t('auth_login.oauth_callback_status_error')} ${state.callbackError || ''}`.trim()}
              </InlineError>
            ) : null}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-kumo-hairline pt-4">
        <div className="flex items-center gap-2 text-sm text-kumo-subtle" role="status">
          <Loader size="sm" />
          {providerText(provider, 'oauth_status_waiting')}
        </div>
        {devinSessionOpen ? (
          <Button
            variant="secondary"
            size="sm"
            loading={state.cancelling}
            onClick={() => void cancelAuth(provider.id)}
          >
            {t('auth_login.devin_oauth_cancel')}
          </Button>
        ) : null}
      </div>
      {state.cancelError ? (
        <InlineError>{`${t('auth_login.devin_oauth_cancel_error')} ${state.cancelError}`}</InlineError>
      ) : null}
    </div>
  );
}
