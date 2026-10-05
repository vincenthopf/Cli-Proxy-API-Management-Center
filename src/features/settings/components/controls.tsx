import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Input, Select, Switch } from '@cloudflare/kumo';
import { getValidationMessage } from '@/features/config/components/blocks/shared';
import {
  isDisabledBySentinel,
  patchForValueKey,
  primaryValueKey,
  readFieldValue,
  validationCodeFor,
} from '../settingsLayout';
import { useFieldText, useSettingsForm } from '../settingsForm';
import { SettingRow, type SettingRowLayout } from './SettingRow';
import { StringListInput } from './StringListInput';

type CommonProps = {
  fieldId: string;
  label?: string;
  description?: ReactNode;
};

function useBoundField(fieldId: string) {
  const { t } = useTranslation();
  const form = useSettingsForm();
  const text = useFieldText()(fieldId);
  const valueKey = primaryValueKey(fieldId);
  return {
    form,
    text,
    value: readFieldValue(form.values, valueKey),
    error: getValidationMessage(t, validationCodeFor(form.validationErrors, fieldId)),
    changed: form.changedFieldIds.has(fieldId),
    set: (next: unknown) => form.onChange(patchForValueKey(form.values, valueKey, next)),
  };
}

export function SwitchSetting({ fieldId, label, description }: CommonProps) {
  const { form, text, value, changed, set } = useBoundField(fieldId);
  const resolvedLabel = label ?? text.label;
  return (
    <SettingRow
      fieldId={fieldId}
      layout="switch"
      label={resolvedLabel}
      description={description ?? text.description}
      tooltip={text.tooltip}
      changed={changed}
    >
      <Switch
        aria-label={resolvedLabel}
        checked={Boolean(value)}
        disabled={form.disabled}
        onCheckedChange={(checked) => set(checked)}
      />
    </SettingRow>
  );
}

export type TextSettingProps = CommonProps & {
  placeholder?: string;
  type?: 'text' | 'number' | 'password';
  min?: number;
  max?: number;
  layout?: SettingRowLayout;
  mono?: boolean;
  showOffWhenNonPositive?: boolean;
};

export function TextSetting({
  fieldId,
  label,
  description,
  placeholder,
  type = 'text',
  min,
  max,
  layout = 'inline',
  mono = false,
  showOffWhenNonPositive = false,
}: TextSettingProps) {
  const { t } = useTranslation();
  const { form, text, value, error, changed, set } = useBoundField(fieldId);
  const stringValue = typeof value === 'string' ? value : String(value ?? '');
  const showOff = showOffWhenNonPositive && isDisabledBySentinel(stringValue, Boolean(error));
  const resolvedLabel = label ?? text.label;
  return (
    <SettingRow
      fieldId={fieldId}
      layout={layout}
      label={resolvedLabel}
      description={description ?? text.description}
      tooltip={text.tooltip}
      error={error}
      changed={changed}
    >
      <div className="flex items-center gap-2">
        <Input
          className={`w-full min-w-0 flex-1 ${mono ? 'font-mono' : ''} ${error ? 'ring-kumo-danger' : ''}`}
          aria-label={resolvedLabel}
          type={type}
          min={min}
          max={max}
          autoComplete={type === 'password' ? 'new-password' : 'off'}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          value={stringValue}
          disabled={form.disabled}
          onChange={(event) => set(event.target.value)}
        />
        {showOff ? <Badge variant="neutral">{t('settings.off')}</Badge> : null}
      </div>
    </SettingRow>
  );
}

export type SelectSettingProps = CommonProps & {
  options: ReadonlyArray<{ value: string; label: string }>;
};

export function SelectSetting({ fieldId, label, description, options }: SelectSettingProps) {
  const { form, text, value, changed, set } = useBoundField(fieldId);
  const resolvedLabel = label ?? text.label;
  return (
    <SettingRow
      fieldId={fieldId}
      label={resolvedLabel}
      description={description ?? text.description}
      tooltip={text.tooltip}
      changed={changed}
    >
      <Select
        className="w-full"
        aria-label={resolvedLabel}
        value={String(value ?? '')}
        disabled={form.disabled}
        items={options.map((option) => ({ value: option.value, label: option.label }))}
        onValueChange={(next) => {
          if (typeof next === 'string') set(next);
        }}
      />
    </SettingRow>
  );
}

export type ListSettingProps = CommonProps & { placeholder?: string };

export function ListSetting({ fieldId, label, description, placeholder }: ListSettingProps) {
  const { form, text, value, error, changed, set } = useBoundField(fieldId);
  const resolvedLabel = label ?? text.label;
  return (
    <SettingRow
      fieldId={fieldId}
      layout="stacked"
      label={resolvedLabel}
      description={description ?? text.description}
      tooltip={text.tooltip}
      error={error}
      changed={changed}
    >
      <StringListInput
        value={Array.isArray(value) ? (value as string[]) : []}
        itemLabel={resolvedLabel}
        placeholder={placeholder}
        invalid={Boolean(error)}
        disabled={form.disabled}
        onChange={(next) => set(next)}
      />
    </SettingRow>
  );
}
