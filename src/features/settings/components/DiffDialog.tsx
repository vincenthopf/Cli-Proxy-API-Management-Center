import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Empty, Text } from '@cloudflare/kumo';
import { EyeIcon, EyeSlashIcon } from '@phosphor-icons/react';
import { computeUnifiedDiff, type UnifiedLineType } from '@/features/config/unifiedDiff';
import { redactYamlText } from '@/utils/redactSecrets';

const LINE_CLASSES: Record<UnifiedLineType, string> = {
  context: 'text-kumo-default',
  addition: 'bg-kumo-success-tint text-kumo-default',
  deletion: 'bg-kumo-danger-tint text-kumo-default',
};

const LINE_PREFIX: Record<UnifiedLineType, string> = {
  context: ' ',
  addition: '+',
  deletion: '-',
};

export type DiffDialogProps = {
  open: boolean;
  original: string;
  modified: string;
  saving: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function DiffDialog({
  open,
  original,
  modified,
  saving,
  onConfirm,
  onCancel,
}: DiffDialogProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const diff = useMemo(() => computeUnifiedDiff(original, modified), [original, modified]);
  const display = (text: string) => (revealed ? text : redactYamlText(text));

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && !saving) onCancel();
      }}
    >
      <Dialog size="xl" className="flex max-h-[90vh] flex-col gap-4 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="text-lg font-semibold text-kumo-default">
              {t('settings.diff.title')}
            </Dialog.Title>
            <Dialog.Description className="text-sm text-kumo-subtle">
              {t('settings.diff.description')}
            </Dialog.Description>
          </div>
          <div className="flex items-center gap-3">
            <Text variant="mono-secondary">
              <span className="text-kumo-success">+{diff.additions}</span>{' '}
              <span className="text-kumo-danger">-{diff.deletions}</span>
            </Text>
            <Button
              variant="ghost"
              size="sm"
              icon={revealed ? <EyeSlashIcon /> : <EyeIcon />}
              onClick={() => setRevealed((current) => !current)}
            >
              {revealed ? t('settings.diff.hide_secrets') : t('settings.diff.show_secrets')}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto rounded-lg bg-kumo-recessed ring ring-kumo-line">
          {diff.hunks.length === 0 ? (
            <Empty size="sm" title={t('config_management.diff.no_changes')} />
          ) : (
            <div className="min-w-max font-mono text-xs leading-5">
              {diff.hunks.map((hunk, hunkIndex) => (
                <div key={hunkIndex} className="border-b border-kumo-line last:border-b-0">
                  <div className="bg-kumo-tint px-3 py-1 text-kumo-subtle">
                    @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
                  </div>
                  {hunk.lines.map((line, lineIndex) => (
                    <div key={lineIndex} className={`flex ${LINE_CLASSES[line.type]}`}>
                      <span className="w-12 shrink-0 pr-2 text-right text-kumo-subtle select-none">
                        {line.oldNum ?? ''}
                      </span>
                      <span className="w-12 shrink-0 pr-2 text-right text-kumo-subtle select-none">
                        {line.newNum ?? ''}
                      </span>
                      <span className="w-5 shrink-0 text-center text-kumo-subtle select-none">
                        {LINE_PREFIX[line.type]}
                      </span>
                      <code className="pr-4 whitespace-pre">{display(line.text) || ' '}</code>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="secondary" disabled={saving} onClick={onCancel}>
            {t('settings.diff.back')}
          </Button>
          <Button variant="primary" loading={saving} onClick={onConfirm}>
            {t('settings.diff.confirm')}
          </Button>
        </div>
      </Dialog>
    </Dialog.Root>
  );
}
