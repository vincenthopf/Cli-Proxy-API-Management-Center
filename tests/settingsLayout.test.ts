import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { DEFAULT_VISUAL_VALUES } from '@/types/visualConfig';
import {
  SETTINGS_SECTION_IDS,
  buildSettingsSummary,
  changedFieldIds,
  countErrorsBySection,
  countFieldsBySection,
  editorModeForSection,
  isDisabledBySentinel,
  legacyConfigTarget,
  parseClientApiKeys,
  patchForValueKey,
  planSectionTransition,
  readFieldValue,
  sectionForField,
  sectionFromPathname,
  settingsPath,
} from '@/features/settings/settingsLayout';
import { AccessSection } from '@/features/settings/sections/AccessSection';
import { LoggingSection } from '@/features/settings/sections/LoggingSection';
import { OverviewSection } from '@/features/settings/sections/OverviewSection';
import { escapeText, renderSection, translations } from './helpers/settingsRender';

describe('settings routes', () => {
  test('resolves the section from the pathname and falls back to the overview', () => {
    expect(sectionFromPathname('/settings')).toBe('overview');
    expect(sectionFromPathname('/settings/routing')).toBe('routing');
    expect(sectionFromPathname('/settings/yaml/')).toBe('yaml');
    expect(sectionFromPathname('/settings/unknown')).toBe('overview');
  });

  test('builds deep links and keeps the overview at the base path', () => {
    expect(settingsPath('overview')).toBe('/settings');
    expect(settingsPath('access')).toBe('/settings/access');
    expect(settingsPath('routing', 'routingStrategy')).toBe(
      '/settings/routing?field=routingStrategy'
    );
  });

  test('redirects legacy /config field links to the owning section', () => {
    expect(legacyConfigTarget('?field=routingStrategy')).toBe(
      '/settings/routing?field=routingStrategy'
    );
    expect(legacyConfigTarget('?field=apiKeys')).toBe('/settings/access?field=apiKeys');
    expect(legacyConfigTarget('?field=nope')).toBe('/settings');
    expect(legacyConfigTarget('')).toBe('/settings');
  });

  test('only the YAML section uses the source editor mode', () => {
    for (const id of SETTINGS_SECTION_IDS) {
      expect(editorModeForSection(id)).toBe(id === 'yaml' ? 'source' : 'visual');
    }
    expect(sectionForField('codexModelLevelCooling')).toBe('routing');
    expect(sectionForField('wsAuth')).toBe('providers');
  });
});

describe('dirty and error accounting', () => {
  test('maps dirty value keys to distinct field ids', () => {
    expect(
      changedFieldIds([
        'apiKeysText',
        'streaming.keepaliveSeconds',
        'streaming.keepaliveSeconds',
        'notAField',
      ])
    ).toEqual(['apiKeys', 'streamingKeepaliveSeconds']);
  });

  test('counts changed fields per section', () => {
    expect(
      countFieldsBySection(['apiKeys', 'routingStrategy', 'disableCooling', 'proxyUrl'])
    ).toEqual({ access: 1, routing: 2, network: 1 });
  });

  test('counts validation errors per section and adds payload errors to providers', () => {
    expect(
      countErrorsBySection(
        {
          port: 'port_range',
          requestRetry: 'non_negative_integer',
          'streaming.bootstrapRetries': 'integer',
          logsMaxTotalSizeMb: undefined,
        },
        true
      )
    ).toEqual({ network: 2, routing: 1, providers: 1 });
  });
});

describe('value access', () => {
  test('reads and patches nested streaming values without touching siblings', () => {
    const values = {
      ...DEFAULT_VISUAL_VALUES,
      streaming: { keepaliveSeconds: '15', bootstrapRetries: '2', nonstreamKeepaliveInterval: '' },
    };
    expect(readFieldValue(values, 'streaming.bootstrapRetries')).toBe('2');
    expect(patchForValueKey(values, 'streaming.keepaliveSeconds', '30')).toEqual({
      streaming: { keepaliveSeconds: '30', bootstrapRetries: '2', nonstreamKeepaliveInterval: '' },
    });
    expect(patchForValueKey(values, 'proxyUrl', 'socks5://h:1')).toEqual({
      proxyUrl: 'socks5://h:1',
    });
  });

  test('summarises the values shown on the overview', () => {
    const summary = buildSettingsSummary(
      {
        ...DEFAULT_VISUAL_VALUES,
        host: ' 127.0.0.1 ',
        port: '8317',
        apiKeysText: 'sk-one\n\n  sk-two  \n',
        routingStrategy: 'fill-first',
        routingSessionAffinity: true,
        routingSessionAffinityTTL: '1h',
      },
      undefined
    );
    expect(summary).toEqual({
      host: '127.0.0.1',
      port: '8317',
      clientKeyCount: 2,
      routingStrategy: 'fill-first',
      sessionAffinity: true,
      sessionAffinityTTL: '1h',
      requestLog: null,
    });
    expect(parseClientApiKeys(' a \n\nb')).toEqual(['a', 'b']);
  });

  test('treats empty and non-positive integers as off unless the value is invalid', () => {
    expect(isDisabledBySentinel('', false)).toBe(true);
    expect(isDisabledBySentinel('-1', false)).toBe(true);
    expect(isDisabledBySentinel('5', false)).toBe(false);
    expect(isDisabledBySentinel('-1.5', true)).toBe(false);
  });
});

describe('section transitions', () => {
  const base = { sourceDirty: false, visualDirty: false, visualParseError: null };

  test('moves freely between visual sections', () => {
    expect(planSectionTransition({ ...base, from: 'routing', to: 'access' })).toEqual({
      kind: 'allow',
      syncSourceFromVisual: false,
      reloadVisualFromSource: false,
    });
  });

  test('materialises visual edits when opening the YAML source', () => {
    expect(
      planSectionTransition({ ...base, visualDirty: true, from: 'routing', to: 'yaml' })
    ).toMatchObject({ kind: 'allow', syncSourceFromVisual: true });
  });

  test('blocks leaving YAML with unsaved source edits', () => {
    expect(
      planSectionTransition({ ...base, sourceDirty: true, from: 'yaml', to: 'routing' })
    ).toEqual({ kind: 'block_source_dirty' });
  });

  test('retries parsing after a YAML error when leaving the source', () => {
    expect(
      planSectionTransition({ ...base, visualParseError: 'bad', from: 'yaml', to: 'network' })
    ).toMatchObject({ kind: 'allow', reloadVisualFromSource: true });
  });
});

describe('settings sections', () => {
  test('overview lists the key values with links into sections', () => {
    const markup = renderSection(
      createElement(OverviewSection, { changedCounts: {}, errorCounts: {}, onOpen: () => {} }),
      {
        values: {
          ...DEFAULT_VISUAL_VALUES,
          port: '8317',
          apiKeysText: 'sk-a\nsk-b\nsk-c',
          routingStrategy: 'round-robin',
          routingSessionAffinity: true,
          routingSessionAffinityTTL: '30m',
        },
      }
    );
    expect(markup).toContain(':8317');
    expect(markup).toContain(
      escapeText(translations.t('settings.overview.client_keys_value', { count: 3 }))
    );
    expect(markup).toContain(
      escapeText(translations.t('settings.routing.strategies.round_robin.label'))
    );
    expect(markup).toContain(
      escapeText(translations.t('settings.overview.on_with_ttl', { ttl: '30m' }))
    );
    for (const id of SETTINGS_SECTION_IDS.filter((section) => section !== 'overview')) {
      expect(markup).toContain(escapeText(translations.t(`settings.sections.${id}.title`)));
    }
  });

  test('access lists client keys masked and explains the hashed management key', () => {
    const markup = renderSection(createElement(AccessSection), {
      values: {
        ...DEFAULT_VISUAL_VALUES,
        apiKeysText: 'sk-test-alpha-key\nsk-test-beta-key',
        rmSecretKey: '$2a$10$hash',
      },
    });
    expect(markup).toContain(escapeText(translations.t('settings.access.key_n', { index: 1 })));
    expect(markup).toContain(escapeText(translations.t('settings.access.key_n', { index: 2 })));
    expect(markup).not.toContain('$2a$10$hash');
    expect(markup).toContain(
      escapeText(translations.t('settings.access.management_key_set_title'))
    );
  });

  test('logging warns that request logs store full prompts and responses', () => {
    const markup = renderSection(
      createElement(LoggingSection, { onServerConfigChanged: () => {} })
    );
    expect(markup).toContain(
      escapeText(translations.t('settings.logging.request_log_warning_title'))
    );
    expect(markup).toContain('id="cfg-field-requestLog"');
  });
});
