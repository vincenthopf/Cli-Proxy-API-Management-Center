import { useTranslation } from 'react-i18next';
import { Banner, Button, LinkButton, Loader, Text } from '@cloudflare/kumo';
import { ArrowsClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { DiffDialog } from './components/DiffDialog';
import { SaveBar } from './components/SaveBar';
import { LoggingSection } from './sections/LoggingSection';
import { SettingsFormContext, type FieldFocusRequest } from './settingsForm';
import { settingsPath } from './settingsLayout';
import { useSettingsEditor } from './useSettingsEditor';

export function LogSettingsEditor({
  active,
  focus,
}: {
  active: boolean;
  focus: FieldFocusRequest | null;
}) {
  const { t } = useTranslation();
  const layer = usePageTransitionLayer();
  const isCurrentLayer = layer ? layer.isCurrentLayer : true;
  const {
    visual,
    doc,
    changedIds,
    totalErrors,
    saveDisabled,
    saveStatusText,
    formValue,
    reloadIfClean,
    initialLoading,
  } = useSettingsEditor({ mode: 'visual', focus, guardEnabled: isCurrentLayer });

  useHeaderRefresh(doc.handleReload, active);

  return (
    <SettingsFormContext.Provider value={formValue}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <Text variant="heading" as="h2">
              {t('logs.settings_title')}
            </Text>
            <Text variant="secondary" size="sm">
              {t('logs.settings_description')}
            </Text>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowsClockwiseIcon />}
            loading={doc.loading && !initialLoading}
            disabled={doc.loading || doc.saving}
            onClick={doc.handleReload}
          >
            {t('settings.reload')}
          </Button>
        </div>

        {doc.error ? (
          <Banner
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title={t('settings.errors.load_title')}
            description={doc.error}
          />
        ) : null}
        {!doc.error && visual.visualParseError ? (
          <Banner
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title={t('config_management.visual_mode_unavailable')}
            description={visual.visualParseError}
            action={
              <LinkButton variant="secondary" size="sm" href={settingsPath('yaml')}>
                {t('logs.settings_open_yaml')}
              </LinkButton>
            }
          />
        ) : null}
        {doc.recoveryRequired ? (
          <Banner
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title={t('settings.errors.recovery_title')}
            description={t('config_management.precise_save_recovery_required')}
          />
        ) : null}

        {initialLoading ? (
          <div className="flex items-center gap-3 py-16 text-kumo-subtle">
            <Loader />
            <Text variant="secondary">{t('config_management.status_loading')}</Text>
          </div>
        ) : (
          <LoggingSection onServerConfigChanged={reloadIfClean} />
        )}

        {active && isCurrentLayer && doc.isDirty ? (
          <SaveBar
            changedCount={changedIds.length}
            sourceDirty={doc.sourceDirty}
            errorCount={totalErrors}
            statusText={saveStatusText}
            saving={doc.saving}
            saveDisabled={saveDisabled}
            discardDisabled={doc.loading || doc.saving}
            onSave={() => void doc.handleSave()}
            onDiscard={doc.handleDiscard}
          />
        ) : null}

        <DiffDialog
          open={doc.diffModalOpen}
          original={doc.serverYaml}
          modified={doc.mergedYaml}
          saving={doc.saving}
          onConfirm={() => void doc.handleConfirmSave()}
          onCancel={doc.closeDiff}
        />
      </div>
    </SettingsFormContext.Provider>
  );
}
