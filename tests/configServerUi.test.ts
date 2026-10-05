import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { DEFAULT_VISUAL_VALUES } from '@/types/visualConfig';
import { FIELD_VALUE_KEYS } from '@/features/config/constants';
import { CONFIG_FIELD_SEARCH_INDEX, searchConfigFields } from '@/features/config/searchIndex';
import { SETTINGS_FIELD_SECTIONS } from '@/features/settings/settingsLayout';
import { NetworkSection } from '@/features/settings/sections/NetworkSection';
import { escapeText, renderSection, translations } from './helpers/settingsRender';

const extras = CONFIG_FIELD_SEARCH_INDEX.filter((entry) =>
  entry.labelKey.includes('.serverExtras.')
);
const populated = {
  ...DEFAULT_VISUAL_VALUES,
  trustedProxies: ['127.0.0.1', '192.168.0.0/24'],
  discoverySubtypes: ['_responses'],
  discoveryInterfacesInclude: ['en*'],
  discoveryInterfacesExclude: ['docker*'],
};
const network = (overrides: Parameters<typeof renderSection>[1] = {}) =>
  renderSection(createElement(NetworkSection, { onOpenYaml: () => {} }), overrides);

describe('server configuration UI', () => {
  test('renders the nine server extras once in the Network section', () => {
    expect(extras).toHaveLength(9);
    const markup = network();
    for (const entry of extras) {
      expect(SETTINGS_FIELD_SECTIONS[entry.fieldId]).toBe('network');
      expect(FIELD_VALUE_KEYS[entry.fieldId]).toEqual([entry.fieldId]);
      expect(markup.split(`id="cfg-field-${entry.fieldId}"`)).toHaveLength(2);
      const path = entry.yamlKeys!.join('.');
      expect(path).toMatch(/^server\.(trusted-proxies|discovery\.)/);
      expect(
        searchConfigFields(path, (key) => translations.t(key)).map((e) => e.fieldId)
      ).toContain(entry.fieldId);
    }
    for (const entry of extras.filter((e) => e.fieldId !== 'trustedProxies')) {
      expect(markup).toContain(escapeText(translations.t(entry.labelKey)));
      expect(markup).toContain(escapeText(translations.t(entry.hintKey!)));
    }
  });

  test('keeps discovery mounted inside a closed disclosure with safe defaults', () => {
    const markup = network();
    const panel = markup
      .split(escapeText(translations.t('config_management.visual.serverExtras.discoveryTitle')))[1]
      .split('</button>')
      .slice(1)
      .join('</button>');
    expect(panel).toMatch(/^<div data-closed="" hidden=""/);
    for (const entry of extras.filter((e) => e.fieldId !== 'trustedProxies')) {
      expect(panel).toContain(`id="cfg-field-${entry.fieldId}"`);
    }
    expect(DEFAULT_VISUAL_VALUES.discoveryAuthRequired).toBe(true);
    const auth = markup
      .split('id="cfg-field-discoveryAuthRequired"')[1]
      .split('id="cfg-field-discoveryAdvertiseManagement"')[0];
    expect(auth).toContain('aria-checked="true"');
  });

  test('labels every list row input and links field labels to their controls', () => {
    const markup = network({ values: populated });
    const trusted = escapeText(translations.t('settings.fields.trustedProxies.label'));
    expect(markup).toContain(`aria-label="${trusted} 1"`);
    expect(markup).toContain(`aria-label="${trusted} 2"`);
    for (const field of ['discoverySubtypes', 'discoveryInterfacesInclude']) {
      const label = escapeText(
        translations.t(`config_management.visual.serverExtras.${field}.label`)
      );
      expect(markup).toContain(`aria-label="${label} 1"`);
    }
    const textInput = markup
      .split('id="cfg-field-discoveryServiceName"')[1]
      .match(/<input\b[^>]*>/)![0];
    const id = textInput.match(/\bid="([^"]+)"/)![1];
    expect(markup).toContain(`for="${id}"`);
  });

  test('shows host and port read-only and disables editable inputs in read-only mode', () => {
    const markup = network({ values: populated, disabled: true });
    for (const field of ['host', 'port']) {
      const input = markup.split(`id="cfg-field-${field}"`)[1].match(/<input\b[^>]*>/)![0];
      expect(input).toContain('readOnly=""');
    }
    const inputs = (markup.match(/<input\b[^>]*>/g) ?? []).filter(
      (input) => !input.includes('readOnly=""')
    );
    expect(inputs.length).toBeGreaterThan(8);
    for (const input of inputs) expect(input).toContain('disabled=""');
  });

  test('renders both validation errors next to their fields', () => {
    const markup = network({
      values: populated,
      validationErrors: {
        trustedProxies: 'invalid_trusted_proxies',
        discoveryServiceType: 'invalid_discovery_service_type',
      },
    });
    for (const [field, code] of [
      ['trustedProxies', 'invalid_trusted_proxies'],
      ['discoveryServiceType', 'invalid_discovery_service_type'],
    ]) {
      const row = markup.split(`id="cfg-field-${field}"`)[1].split('data-setting-row=')[1];
      expect(row).toContain(
        escapeText(translations.t(`config_management.visual.validation.${code}`))
      );
      expect(row).toContain('aria-invalid="true"');
    }
  });
});
