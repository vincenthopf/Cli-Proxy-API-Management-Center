import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Field } from '@cloudflare/kumo';
import { configFieldDomId } from '@/features/config/searchIndex';

export type SettingRowLayout = 'inline' | 'switch' | 'stacked';

const LAYOUT_CLASSES: Record<SettingRowLayout, string> = {
  inline:
    'md:[&>div]:!grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:[&>div]:gap-x-8 md:[&>div]:gap-y-1 md:[&>div>:nth-child(2)]:[grid-column:2] md:[&>div>:nth-child(2)]:[grid-row:1/span_2] md:[&>div>:nth-child(2)]:self-center md:[&>div>:nth-child(n+3)]:![grid-column:1]',
  switch:
    '[&>div]:!grid-cols-[minmax(0,1fr)_auto] [&>div]:gap-x-6 [&>div]:gap-y-1 [&>div>:nth-child(2)]:[grid-column:2] [&>div>:nth-child(2)]:[grid-row:1/span_2] [&>div>:nth-child(2)]:self-center [&>div>:nth-child(n+3)]:![grid-column:1]',
  stacked: '',
};

export type SettingRowProps = {
  fieldId?: string;
  label: ReactNode;
  description?: ReactNode;
  tooltip?: ReactNode;
  error?: string;
  changed?: boolean;
  layout?: SettingRowLayout;
  children: ReactNode;
};

export function SettingRow({
  fieldId,
  label,
  description,
  tooltip,
  error,
  changed = false,
  layout = 'inline',
  children,
}: SettingRowProps) {
  const { t } = useTranslation();
  return (
    <div
      id={fieldId ? configFieldDomId(fieldId) : undefined}
      data-setting-row={fieldId}
      className={`-mx-2 scroll-mt-24 rounded-lg px-2 py-4 transition-shadow ${LAYOUT_CLASSES[layout]}`}
    >
      <Field
        label={
          <span className="inline-flex items-center gap-2">
            {label}
            {changed ? (
              <span
                className="size-1.5 shrink-0 rounded-full bg-kumo-brand"
                title={t('settings.edited')}
                aria-hidden="true"
              />
            ) : null}
          </span>
        }
        labelTooltip={tooltip}
        description={description}
        error={error ? { message: error, match: true } : undefined}
      >
        <div className="min-w-0">{children}</div>
      </Field>
    </div>
  );
}
