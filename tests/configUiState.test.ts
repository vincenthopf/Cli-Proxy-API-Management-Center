import { describe, expect, test } from 'bun:test';
import { countTotalErrors, resolveStatus, type ConfigStatusInput } from '@/features/config/uiState';
import type { VisualConfigValidationErrors } from '@/types/visualConfig';

const statusInput = (overrides: Partial<ConfigStatusInput> = {}): ConfigStatusInput => ({
  disconnected: false,
  loading: false,
  loadFailed: false,
  yamlError: false,
  validationBlocked: false,
  saving: false,
  dirty: false,
  ...overrides,
});

describe('resolveStatus', () => {
  test('follows the legacy precedence chain top-down', () => {
    // disconnected > loading > load_failed > yaml_error > validation_blocked > saving > dirty > synced
    expect(resolveStatus(statusInput({ disconnected: true, loading: true })).key).toBe(
      'disconnected'
    );
    expect(resolveStatus(statusInput({ loading: true, loadFailed: true })).key).toBe('loading');
    expect(resolveStatus(statusInput({ loadFailed: true, yamlError: true })).key).toBe(
      'load_failed'
    );
    expect(resolveStatus(statusInput({ yamlError: true, validationBlocked: true })).key).toBe(
      'yaml_error'
    );
    expect(resolveStatus(statusInput({ validationBlocked: true, saving: true })).key).toBe(
      'validation_blocked'
    );
    expect(resolveStatus(statusInput({ saving: true, dirty: true })).key).toBe('saving');
    expect(resolveStatus(statusInput({ dirty: true })).key).toBe('dirty');
    expect(resolveStatus(statusInput()).key).toBe('synced');
  });

  test('validation_blocked short key lives at config_management top level (regression: old .visual. path bug)', () => {
    const status = resolveStatus(statusInput({ validationBlocked: true }));
    expect(status.shortLabelKey).toBe('config_management.validation_blocked_short');
    expect(status.labelKey).toBe('config_management.visual.validation.validation_blocked');
    expect(status.tone).toBe('error');
  });

  test('every status resolves label keys that exist in the English locale', async () => {
    const inputs: Partial<ConfigStatusInput>[] = [
      { disconnected: true },
      { loading: true },
      { loadFailed: true },
      { yamlError: true },
      { validationBlocked: true },
      { saving: true },
      { dirty: true },
      {},
    ];
    const json = (await Bun.file('src/i18n/locales/en.json').json()) as Record<string, unknown>;
    const resolveKey = (path: string): unknown =>
      path.split('.').reduce<unknown>((node, part) => {
        if (node && typeof node === 'object') return (node as Record<string, unknown>)[part];
        return undefined;
      }, json);
    for (const overrides of inputs) {
      const status = resolveStatus(statusInput(overrides));
      expect(typeof resolveKey(status.labelKey)).toBe('string');
      expect(typeof resolveKey(status.shortLabelKey)).toBe('string');
    }
  });
});

describe('countTotalErrors', () => {
  test('sums field errors plus the payload flag', () => {
    const errors: VisualConfigValidationErrors = {
      port: 'port_range',
      maxRetryInterval: 'non_negative_integer',
      logsMaxTotalSizeMb: undefined,
    };
    expect(countTotalErrors(errors, false)).toBe(2);
    expect(countTotalErrors(errors, true)).toBe(3);
    expect(countTotalErrors(undefined, false)).toBe(0);
  });
});
