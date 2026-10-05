import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, test } from 'bun:test';
import { FIELD_VALUE_KEYS } from '@/features/config/constants';
import {
  CONFIG_FIELD_SEARCH_INDEX,
  findConfigFieldById,
  searchConfigFields,
} from '@/features/config/searchIndex';
import {
  SETTINGS_FIELD_SECTIONS,
  fieldIdForValueKey,
  type SettingsSectionId,
} from '@/features/settings/settingsLayout';
import { getVisualConfigValidationErrors } from '@/hooks/useVisualConfig';
import { DEFAULT_VISUAL_VALUES } from '@/types/visualConfig';

const SEARCH_SECTION_IDS = new Set([
  'connectivity',
  'network',
  'logging',
  'quota',
  'streaming',
  'advanced',
  'payload',
]);

const SECTION_FILES: Record<string, SettingsSectionId> = {
  'AccessSection.tsx': 'access',
  'RoutingSection.tsx': 'routing',
  'LoggingSection.tsx': 'logging',
  'NetworkSection.tsx': 'network',
  'ProvidersSection.tsx': 'providers',
  'AdvancedSection.tsx': 'advanced',
};

const NON_YAML_VISUAL_FIELDS = new Set(['requestLog']);

const INDEX_FIELD_IDS = CONFIG_FIELD_SEARCH_INDEX.map((entry) => entry.fieldId);
const INDEX_FIELD_ID_SET = new Set(INDEX_FIELD_IDS);

/** VisualConfigValues 的叶值键：顶层标量 + streaming 展开为点号叶（= dirtyFields 的键域）。 */
const LEAF_VALUE_KEYS = new Set(
  Object.keys(DEFAULT_VISUAL_VALUES).flatMap((key) =>
    key === 'streaming'
      ? Object.keys(DEFAULT_VISUAL_VALUES.streaming).map((leaf) => `streaming.${leaf}`)
      : [key]
  )
);

const sorted = (values: Iterable<string>) => [...values].sort();

describe('search index integrity', () => {
  test('field ids are unique', () => {
    expect(INDEX_FIELD_ID_SET.size).toBe(INDEX_FIELD_IDS.length);
  });

  test('every entry belongs to a canonical search section', () => {
    for (const entry of CONFIG_FIELD_SEARCH_INDEX) {
      expect(SEARCH_SECTION_IDS.has(entry.sectionId)).toBe(true);
    }
  });

  test('resolves the routing strategy deep-link target', () => {
    expect(findConfigFieldById('routingStrategy')).toMatchObject({
      fieldId: 'routingStrategy',
      sectionId: 'network',
    });
    expect(findConfigFieldById('unknown')).toBeUndefined();
  });

  test('label / qualifier / hint keys resolve to strings in en.json', async () => {
    const json = (await Bun.file('src/i18n/locales/en.json').json()) as Record<string, unknown>;
    const resolveKey = (path: string): unknown =>
      path.split('.').reduce<unknown>((node, part) => {
        if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
        return undefined;
      }, json);

    for (const entry of CONFIG_FIELD_SEARCH_INDEX) {
      expect(typeof resolveKey(entry.labelKey)).toBe('string');
      if (entry.qualifierKey) expect(typeof resolveKey(entry.qualifierKey)).toBe('string');
      if (entry.hintKey) expect(typeof resolveKey(entry.hintKey)).toBe('string');
    }
  });
});

describe('value-key coverage (index ↔ VisualConfigValues)', () => {
  test('FIELD_VALUE_KEYS keys are exactly the index field ids', () => {
    expect(sorted(Object.keys(FIELD_VALUE_KEYS))).toEqual(sorted(INDEX_FIELD_ID_SET));
  });

  test('the union of mapped value keys is exactly the VisualConfigValues leaf keys', () => {
    const mapped = new Set(Object.values(FIELD_VALUE_KEYS).flat());
    // 双向：漏映射的表单键 / 指向不存在键的映射，都在这里现形
    expect(sorted(mapped)).toEqual(sorted(LEAF_VALUE_KEYS));
  });
});

describe('settings layout coverage', () => {
  test('every index field has exactly one settings section', () => {
    expect(sorted(Object.keys(SETTINGS_FIELD_SECTIONS))).toEqual(sorted(INDEX_FIELD_ID_SET));
  });

  test('each section file renders exactly the fields mapped to it', () => {
    const sectionsDir = join(import.meta.dir, '../src/features/settings/sections');
    const seen = new Set<string>();
    for (const name of readdirSync(sectionsDir).filter((file) => file.endsWith('.tsx'))) {
      const source = readFileSync(join(sectionsDir, name), 'utf8');
      const rendered = new Set<string>();
      for (const match of source.matchAll(/fieldId="([^"]+)"/g)) rendered.add(match[1]);
      for (const match of source.matchAll(/configFieldDomId\('([^']+)'\)/g)) rendered.add(match[1]);
      for (const id of NON_YAML_VISUAL_FIELDS) rendered.delete(id);
      const section = SECTION_FILES[name];
      const expected = section
        ? Object.entries(SETTINGS_FIELD_SECTIONS)
            .filter(([, owner]) => owner === section)
            .map(([fieldId]) => fieldId)
        : [];
      expect({ name, fields: sorted(rendered) }).toEqual({ name, fields: sorted(expected) });
      for (const id of rendered) {
        expect(seen.has(id)).toBe(false);
        seen.add(id);
      }
    }
    expect(sorted(seen)).toEqual(sorted(INDEX_FIELD_ID_SET));
  });

  test('every validation field path maps to a field with a settings section', () => {
    const allPaths = Object.keys(getVisualConfigValidationErrors(DEFAULT_VISUAL_VALUES));
    for (const path of allPaths) {
      expect(LEAF_VALUE_KEYS.has(path)).toBe(true);
      const fieldId = fieldIdForValueKey(path);
      expect(fieldId).toBeDefined();
      expect(SETTINGS_FIELD_SECTIONS[fieldId!]).toBeDefined();
    }
  });
});

describe('v8 YAML search paths', () => {
  for (const [fieldId, path] of [
    ['apiKeys', 'access.api-keys'],
    ['commercialMode', 'server.commercial-mode'],
    ['requestRetry', 'routing.retry.request-retry'],
    ['routingStrategy', 'routing.strategy'],
    ['quotaSwitchProject', 'quota-exceeded.switch-project'],
    ['quotaSwitchPreviewModel', 'quota-exceeded.switch-preview-model'],
    ['quotaAntigravityCredits', 'oauth.providers.antigravity.antigravity-credits'],
    ['wsAuth', 'oauth.providers.aistudio.ws-auth'],
    ['codexHeaderUserAgent', 'oauth.providers.codex.header-defaults.user-agent'],
    ['streamingNonstreamKeepalive', 'requests.nonstream-keepalive-interval'],
    ['payloadDefaultRules', 'requests.payload.default'],
    ['pluginStoreAuth', 'plugins.store-auth'],
  ]) {
    test(`indexes ${path}`, () => {
      expect(findConfigFieldById(fieldId)?.yamlKeys?.join('.')).toBe(path);
      expect(searchConfigFields(path, () => '').map((entry) => entry.fieldId)).toContain(fieldId);
    });
  }
});
