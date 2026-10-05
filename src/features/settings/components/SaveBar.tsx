import { Button, Text } from '@cloudflare/kumo';
import { useTranslation } from 'react-i18next';
import { Panel } from '@/components/ui/Panel';

export type SaveBarProps = {
  changedCount: number;
  sourceDirty: boolean;
  errorCount: number;
  statusText?: string;
  saving: boolean;
  saveDisabled: boolean;
  discardDisabled: boolean;
  onSave: () => void;
  onDiscard: () => void;
};

export function SaveBar({
  changedCount,
  sourceDirty,
  errorCount,
  statusText,
  saving,
  saveDisabled,
  discardDisabled,
  onSave,
  onDiscard,
}: SaveBarProps) {
  const { t } = useTranslation();
  const summary = sourceDirty
    ? t('settings.save_bar.yaml_changes')
    : t('settings.save_bar.changes', { count: changedCount });

  return (
    <div
      className="sticky bottom-4 z-20 mt-6"
      role="region"
      aria-label={t('settings.save_bar.label')}
    >
      <Panel
        padding="sm"
        className="flex flex-col gap-3 py-3 shadow-lg sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex min-w-0 flex-col" aria-live="polite">
          <Text bold>{summary}</Text>
          {errorCount > 0 ? (
            <Text variant="error" size="sm">
              {t('settings.save_bar.errors', { count: errorCount })}
            </Text>
          ) : statusText ? (
            <Text variant="secondary" size="sm">
              {statusText}
            </Text>
          ) : null}
        </div>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" disabled={discardDisabled} onClick={onDiscard}>
            {t('settings.save_bar.discard')}
          </Button>
          <Button variant="primary" loading={saving} disabled={saveDisabled} onClick={onSave}>
            {t('settings.save_bar.save')}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
