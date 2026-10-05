import { expect, test } from 'bun:test';
import en from '@/i18n/locales/en.json';

test('provider advanced editors have complete English translations', () => {
  for (const section of ['runtimePolicy', 'modelOptions', 'behavior'] as const) {
    const values = Object.values(en.providersPage[section]);
    expect(values.length).toBeGreaterThan(0);
    expect(values.every((value) => typeof value === 'string' && value.trim().length > 0)).toBe(
      true
    );
  }
});
