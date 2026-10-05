import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { DEFAULT_VISUAL_VALUES } from '@/types/visualConfig';
import { CodexLiveICEServersEditor } from '@/features/config/components/blocks/CodexLiveICEServersEditor';
import { CONFIG_FIELD_SEARCH_INDEX } from '@/features/config/searchIndex';
import { SETTINGS_FIELD_SECTIONS } from '@/features/settings/settingsLayout';
import { ProvidersSection } from '@/features/settings/sections/ProvidersSection';
import { RoutingSection } from '@/features/settings/sections/RoutingSection';
import { escapeText, renderSection, translations } from './helpers/settingsRender';

const noop = () => {};
const render = (element: ReturnType<typeof createElement>) =>
  renderToStaticMarkup(createElement(I18nextProvider, { i18n: translations }, element));
const text = (key: string) =>
  escapeText(translations.t(`config_management.visual.additions.${key}`));
const fieldLabel = (fieldId: string, labelKey: string) => {
  const override = `settings.fields.${fieldId}.label`;
  return escapeText(
    translations.exists(override) ? translations.t(override) : translations.t(labelKey)
  );
};
const server = {
  id: 'fixture-ice',
  urlsText: 'stun:stun.example.test:3478\nturn:turn.example.test:3478',
  username: 'test-user',
  credential: 'synthetic-turn-password',
};

describe('OAuth behavior configuration UI', () => {
  test('places every addition in exactly one settings section', () => {
    const routing = renderSection(createElement(RoutingSection));
    const providers = renderSection(createElement(ProvidersSection));
    const additions = CONFIG_FIELD_SEARCH_INDEX.filter((entry) =>
      entry.labelKey.includes('.additions.')
    );
    expect(additions).toHaveLength(26);
    for (const entry of additions) {
      const section = SETTINGS_FIELD_SECTIONS[entry.fieldId];
      expect(['routing', 'providers']).toContain(section);
      const own = section === 'routing' ? routing : providers;
      const other = section === 'routing' ? providers : routing;
      expect(own).toContain(`id="cfg-field-${entry.fieldId}"`);
      expect(other).not.toContain(`id="cfg-field-${entry.fieldId}"`);
      if (entry.fieldId !== 'codexLiveMediaRelayICEServers') {
        expect(own).toContain(fieldLabel(entry.fieldId, entry.labelKey));
      }
      expect(entry.yamlKeys?.join('.')).toMatch(/^(routing|multimedia|oauth)\./);
    }
    expect(providers).toContain(text('liveRelayHint'));
    expect(routing).toContain(escapeText(translations.t('settings.routing.model_cooling_title')));
  });

  test('renders labeled multi-line ICE URLs, masked credentials, and indexed removal actions', () => {
    const markup = render(
      createElement(CodexLiveICEServersEditor, {
        value: [server, { ...server, id: 'second-ice' }],
        onChange: noop,
      })
    );
    expect(markup.match(/<textarea\b/g)).toHaveLength(2);
    expect(markup).toContain(server.urlsText);
    const passwordInputs = markup.match(/<input\b[^>]*type="password"[^>]*>/g) ?? [];
    expect(passwordInputs).toHaveLength(2);
    for (const input of passwordInputs) {
      expect(input).toContain('autoComplete="new-password"');
      expect(input).toContain(`value="${server.credential}"`);
    }
    const inputs = markup.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
    expect(inputs).toHaveLength(6);
    for (const input of inputs) {
      const id = input.match(/\bid="([^"]+)"/)?.[1];
      expect(id).toBeTruthy();
      expect(markup).toContain(`for="${id}"`);
    }
    expect(markup).toContain(text('iceURLs'));
    expect(markup).toContain(text('iceUsername'));
    expect(markup).toContain(text('iceCredential'));
    expect(markup).toContain('aria-label="Remove ICE server 1"');
    expect(markup).toContain('aria-label="Remove ICE server 2"');
    expect(markup).not.toContain('{{index}}');
  });

  test('disables every provider editor when configuration is read-only', () => {
    const values = { ...DEFAULT_VISUAL_VALUES, codexLiveMediaRelayICEServers: [server] };
    for (const Section of [ProvidersSection, RoutingSection]) {
      const markup = renderSection(createElement(Section), { values, disabled: true });
      const controls = markup.match(/<(?:input|textarea)\b[^>]*>/g) ?? [];
      expect(controls.length).toBeGreaterThan(0);
      for (const control of controls) expect(control).toContain('disabled=""');
      const switches = markup.match(/<button\b[^>]*role="switch"[^>]*>/g) ?? [];
      expect(switches.length).toBeGreaterThan(0);
      for (const control of switches) expect(control).toContain('disabled=""');
    }
  });

  test('preserves blank string inputs and permits negative transient cooldowns', () => {
    const providers = renderSection(createElement(ProvidersSection));
    for (const input of providers.match(/<input\b[^>]*type="(?:text|number)"[^>]*>/g) ?? []) {
      expect(input).toContain('value=""');
    }
    const routing = renderSection(createElement(RoutingSection), {
      values: { ...DEFAULT_VISUAL_VALUES, transientErrorCooldownSeconds: '-1' },
    });
    const input = routing.match(/<input\b[^>]*value="-1"[^>]*>/)?.[0];
    expect(input).toContain('type="number"');
    expect(input).not.toContain('min=');
  });

  test('renders translated validation errors and associates the ICE error with its controls', () => {
    const markup = renderSection(createElement(ProvidersSection), {
      values: { ...DEFAULT_VISUAL_VALUES, codexLiveMediaRelayICEServers: [server] },
      validationErrors: {
        codexStreamBootstrapTimeout: 'invalid_duration',
        codexLiveMediaRelayICEServers: 'invalid_ice_servers',
      },
    });
    expect(markup).toContain(
      escapeText(translations.t('config_management.visual.validation.invalid_duration'))
    );
    expect(markup).toContain(
      escapeText(translations.t('config_management.visual.validation.invalid_ice_servers'))
    );
    const textarea = markup.match(/<textarea\b[^>]*>/)?.[0] ?? '';
    expect(textarea).toContain('aria-invalid="true"');
    const ids = textarea.match(/aria-describedby="([^"]+)"/)?.[1].split(' ') ?? [];
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(markup).toContain(`id="${id}"`);
  });
});
