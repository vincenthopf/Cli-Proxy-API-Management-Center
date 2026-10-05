import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { MemoryRouter } from 'react-router-dom';
import i18n from '@/i18n';
import { SettingsFormContext, type SettingsFormValue } from '@/features/settings/settingsForm';
import { DEFAULT_VISUAL_VALUES } from '@/types/visualConfig';

export const translations = i18n.cloneInstance({ lng: 'en' });

export function formValue(overrides: Partial<SettingsFormValue> = {}): SettingsFormValue {
  return {
    values: DEFAULT_VISUAL_VALUES,
    validationErrors: {},
    hasPayloadValidationErrors: false,
    changedFieldIds: new Set(),
    disabled: false,
    focus: null,
    onChange: () => {},
    ...overrides,
  };
}

export function renderSection(element: ReactElement, overrides: Partial<SettingsFormValue> = {}) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(
        I18nextProvider,
        { i18n: translations },
        createElement(SettingsFormContext.Provider, { value: formValue(overrides) }, element)
      )
    )
  );
}

export const escapeText = (value: string) =>
  renderToStaticMarkup(createElement('span', null, value)).slice(6, -7);
