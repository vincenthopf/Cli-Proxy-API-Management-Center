import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useNotificationStore } from '@/stores';
import { LinkButton } from '@cloudflare/kumo';
import { Panel, PanelEmpty } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { IconCheckCircle2, IconExternalLink, IconPlus } from '@/components/ui/icons';
import { PROVIDER_LOGOS } from '../brandLogos';
import { APIKEY_FUN_AFFILIATE_URL, APIKEY_FUN_DASHBOARD_URL } from '../sponsor';
import { isSponsorPartialMutationError } from '../sponsorMutationRecovery';
import type { ProviderEntryFormInput, ProviderResource } from '../types';
import type { UseProviderWorkbenchResult } from '../useProviderWorkbench';
import { SponsorProviderForm } from '../sheets/forms/SponsorProviderForm';

interface SponsorQuickStartPanelProps {
  resource: ProviderResource | null;
  workbench: UseProviderWorkbenchResult;
  mutationDisabled?: boolean;
}

export function SponsorQuickStartPanel({
  resource,
  workbench,
  mutationDisabled = false,
}: SponsorQuickStartPanelProps) {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const formId = useId();
  const [submitting, setSubmitting] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const formMutating = submitting || mutationDisabled || workbench.mutating;
  const mode = resource ? 'edit' : 'create';
  const submitDisabled = formMutating || (mode === 'edit' && !isDirty);
  const logo = PROVIDER_LOGOS.apikeyFun;

  useUnsavedChangesGuard({
    shouldBlock: isDirty && !submitting,
    dialog: {
      title: t('providersPage.unsavedChanges.title'),
      message: t('providersPage.unsavedChanges.message'),
      confirmText: t('providersPage.unsavedChanges.discard'),
      cancelText: t('providersPage.unsavedChanges.keepEditing'),
      variant: 'danger',
    },
  });

  const handleSubmit = async (input: ProviderEntryFormInput) => {
    if (mutationDisabled) return;
    setSubmitting(true);
    try {
      if (resource) {
        await workbench.updateProvider(resource, input);
        showNotification(t('providersPage.toast.updated'), 'success');
      } else {
        await workbench.createProvider('apikeyFun', input);
        showNotification(t('providersPage.toast.created'), 'success');
        setShowCreateForm(false);
      }
      setIsDirty(false);
      setFormVersion((current) => current + 1);
    } catch (err) {
      if (isSponsorPartialMutationError(err)) {
        showNotification(t('providersPage.sponsor.partialMutationWarning'), 'warning');
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      showNotification(
        `${t(resource ? 'notification.update_failed' : 'notification.add_failed')}: ${msg}`,
        'error'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const header = (extra?: ReactNode) => (
    <div className="flex min-w-0 flex-wrap items-center gap-3">
      <img
        src={logo.src}
        alt=""
        aria-hidden="true"
        className="size-8 shrink-0 rounded-md object-contain"
      />
      <h2 className="m-0 min-w-0 text-2xl font-semibold text-kumo-strong">
        {t('providersPage.providerNames.apikeyFun')}
      </h2>
      {extra}
    </div>
  );

  if (!resource && !showCreateForm) {
    return (
      <Panel padding="none" className="flex flex-col">
        <div className="border-b border-kumo-line p-4 md:p-5">{header()}</div>
        <PanelEmpty
          title={t('providersPage.sponsor.emptyRegisterHint')}
          contents={
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button
                variant="primary"
                onClick={() => setShowCreateForm(true)}
                disabled={formMutating}
              >
                <IconPlus size={16} />
                <span>{t('providersPage.actions.new')}</span>
              </Button>
              <LinkButton
                href={APIKEY_FUN_AFFILIATE_URL}
                external
                variant="secondary"
                icon={<IconExternalLink size={16} />}
              >
                {t('providersPage.sponsor.registerNow')}
              </LinkButton>
            </div>
          }
        />
      </Panel>
    );
  }

  const actionHref = resource ? APIKEY_FUN_DASHBOARD_URL : APIKEY_FUN_AFFILIATE_URL;
  const actionLabel = resource
    ? t('providersPage.sponsor.dashboardLink')
    : t('providersPage.sponsor.registerLink');

  return (
    <Panel className="flex flex-col gap-5">
      {header(
        <LinkButton
          href={actionHref}
          external
          variant="ghost"
          size="sm"
          icon={<IconExternalLink size={14} />}
        >
          {actionLabel}
        </LinkButton>
      )}

      <SponsorProviderForm
        key={`${mode}:${resource?.id ?? 'new'}:${formVersion}`}
        resource={resource}
        mode={mode}
        mutating={formMutating}
        formId={formId}
        variant="quickStart"
        onSubmit={handleSubmit}
        onDirtyChange={setIsDirty}
      />

      <div className="flex flex-col-reverse items-stretch gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
        {!resource ? (
          <Button
            variant="ghost"
            onClick={() => {
              setShowCreateForm(false);
              setIsDirty(false);
              setFormVersion((current) => current + 1);
            }}
            disabled={submitting}
          >
            {t('providersPage.actions.cancel')}
          </Button>
        ) : null}
        <Button
          type="submit"
          form={formId}
          variant="primary"
          loading={submitting}
          disabled={submitDisabled}
          className="justify-center"
        >
          {submitting ? null : mode === 'create' ? (
            <IconPlus size={14} />
          ) : (
            <IconCheckCircle2 size={14} />
          )}
          <span>
            {mode === 'create'
              ? t('providersPage.actions.create')
              : t('providersPage.actions.save')}
          </span>
        </Button>
      </div>
    </Panel>
  );
}
