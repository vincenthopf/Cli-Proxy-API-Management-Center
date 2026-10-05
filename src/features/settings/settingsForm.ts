import { createContext, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { findConfigFieldById } from '@/features/config/searchIndex';
import type { VisualConfigValidationErrors, VisualConfigValues } from '@/types/visualConfig';

export type FieldFocusRequest = { fieldId: string; id: number };

export type SettingsFormValue = {
  values: VisualConfigValues;
  validationErrors: VisualConfigValidationErrors;
  hasPayloadValidationErrors: boolean;
  changedFieldIds: ReadonlySet<string>;
  disabled: boolean;
  focus: FieldFocusRequest | null;
  onChange: (patch: Partial<VisualConfigValues>) => void;
};

export const SettingsFormContext = createContext<SettingsFormValue | null>(null);

export function useSettingsForm(): SettingsFormValue {
  const value = useContext(SettingsFormContext);
  if (!value) throw new Error('useSettingsForm must be used inside SettingsFormContext');
  return value;
}

export type FieldText = { label: string; description?: string; tooltip?: string };

export function useFieldText() {
  const { t, i18n } = useTranslation();
  return (fieldId: string): FieldText => {
    const entry = findConfigFieldById(fieldId);
    const labelKey = `settings.fields.${fieldId}.label`;
    const descriptionKey = `settings.fields.${fieldId}.description`;
    const fallbackLabel = entry ? t(entry.labelKey) : fieldId;
    const fallbackHint = entry?.hintKey ? t(entry.hintKey) : undefined;
    const label = i18n.exists(labelKey) ? t(labelKey) : fallbackLabel;
    if (i18n.exists(descriptionKey)) {
      return { label, description: t(descriptionKey), tooltip: fallbackHint };
    }
    return { label, description: fallbackHint };
  };
}
