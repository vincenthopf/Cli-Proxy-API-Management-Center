import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { I18nextProvider } from 'react-i18next';
import { createInstance } from 'i18next';
import en from '@/i18n/locales/en.json';
import type { AuthFileItem } from '@/types';
import type { UsageResponse } from '@/services/api/sidecar';
import type { AccountRecord } from '@/features/overview/accounts';
import { QuotaBars } from '@/features/overview/components/QuotaBars';
import {
  accountRowStatus,
  hourlyTokens,
  indexSidecarAccounts,
  matchSidecarAccount,
} from '@/features/authFiles/accountRows';
import {
  addAccountParamValue,
  newestAccountName,
  parseAddAccountTarget,
} from '@/features/authFiles/addAccount/addAccountLogic';

const i18n = createInstance();
await i18n.init({ lng: 'en', resources: { en: { translation: en } } });

const NOW = Date.parse('2026-10-06T12:00:00Z');
const hours = (n: number) => new Date(NOW + n * 3600_000).toISOString();

const window = (remaining: number | null, resetsAt: string | null) => ({
  utilization: remaining === null ? null : 100 - remaining,
  remaining,
  resets_at: resetsAt,
  observed_at: null,
  source: 'poll' as const,
});

const account = (overrides: Partial<AccountRecord> = {}): AccountRecord => ({
  auth_index: 'idx-1',
  name: 'claude-a.json',
  email: 'a@example.com',
  provider: 'claude',
  label: null,
  disabled: false,
  unavailable: false,
  priority: 100,
  recommended_priority: null,
  serving_rank: 1,
  cooldown_until: null,
  five_hour: window(80, hours(3)),
  seven_day: window(60, hours(48)),
  last_served_at: null,
  requests_24h: 4,
  failures_24h: 0,
  tokens_24h: { input: 0, output: 0, cache_read: 0, cache_creation: 0 },
  ...overrides,
});

const file = (overrides: Partial<AuthFileItem> = {}): AuthFileItem => ({
  name: 'claude-a.json',
  type: 'claude',
  email: 'a@example.com',
  authIndex: 'idx-1',
  ...overrides,
});

describe('sidecar account matching', () => {
  test('matches by auth index first, then file name, then a unique email', () => {
    const index = indexSidecarAccounts([
      account(),
      account({ auth_index: 'idx-2', name: 'codex-b.json', email: 'shared@example.com' }),
      account({ auth_index: 'idx-3', name: 'codex-c.json', email: 'shared@example.com' }),
    ]);
    expect(matchSidecarAccount(file(), index)?.auth_index).toBe('idx-1');
    expect(
      matchSidecarAccount(file({ authIndex: 'missing', name: 'codex-b.json' }), index)?.auth_index
    ).toBe('idx-2');
    expect(
      matchSidecarAccount(
        file({ authIndex: null, name: 'other.json', email: 'shared@example.com' }),
        index
      )
    ).toBeNull();
  });
});

describe('account row status', () => {
  test('reports serving, standby, paused and out-of-quota states', () => {
    expect(accountRowStatus(file(), account(), NOW).kind).toBe('serving');
    expect(accountRowStatus(file(), account({ serving_rank: 2 }), NOW).kind).toBe('standby');
    expect(accountRowStatus(file({ disabled: true }), account(), NOW).kind).toBe('paused');
    expect(accountRowStatus(file(), account({ seven_day: window(0, hours(10)) }), NOW).kind).toBe(
      'exhausted'
    );
  });

  test('reports cooling with the remaining time and errors with a short reason', () => {
    const cooling = accountRowStatus(file(), account({ cooldown_until: hours(1) }), NOW);
    expect(cooling).toEqual({ kind: 'cooling', remainingMs: 3600_000 });
    const error = accountRowStatus(
      file({ status: 'error', status_message: 'x'.repeat(80) }),
      account(),
      NOW
    );
    expect(error.kind).toBe('error');
    expect(error.kind === 'error' && error.reason.length).toBe(48);
  });

  test('treats accounts the sidecar does not track as ready', () => {
    expect(accountRowStatus(file({ type: 'codex' }), null, NOW).kind).toBe('ready');
  });
});

describe('hourly token series', () => {
  test('orders one account series by time and sums input and output', () => {
    const usage = {
      series: [
        { t: hours(-1), key: 'idx-1', input: 5, output: 5 },
        { t: hours(-2), key: 'idx-1', input: 1, output: 2 },
        { t: hours(-1), key: 'idx-2', input: 50, output: 50 },
      ],
      groups: [],
    } as unknown as UsageResponse;
    expect(hourlyTokens(usage, 'idx-1')).toEqual([3, 10]);
    expect(hourlyTokens(usage, null)).toEqual([]);
  });
});

describe('add account targets', () => {
  test('maps deep-link values to dialog targets and back', () => {
    expect(parseAddAccountTarget(null)).toBeNull();
    expect(parseAddAccountTarget('claude')).toBe('anthropic');
    expect(parseAddAccountTarget('')).toBe('other');
    expect(parseAddAccountTarget('Codex')).toBe('codex');
    expect(addAccountParamValue('anthropic')).toBe('claude');
  });

  test('names the most recently modified credential of the signed-in provider', () => {
    const files: AuthFileItem[] = [
      { name: 'claude-old.json', type: 'claude', email: 'old@example.com', modified: 1 },
      { name: 'claude-new.json', type: 'claude', email: 'new@example.com', modified: 5 },
      { name: 'codex.json', type: 'codex', email: 'codex@example.com', modified: 9 },
    ];
    expect(newestAccountName(files, 'claude')).toBe('new@example.com');
    expect(newestAccountName(files, 'kimi')).toBeNull();
  });
});

describe('QuotaBars', () => {
  test('renders labelled meters with remaining percent and a written-out reset', () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(QuotaBars, {
          fiveHour: window(8, hours(4)),
          weekly: window(60, hours(48)),
          now: NOW,
        })
      )
    );
    expect(markup.match(/role="meter"/g)).toHaveLength(2);
    expect(markup).toContain('8% left');
    expect(markup).toContain('Resets in 4h 0m');
    expect(markup).toContain('bg-kumo-danger');
    expect(markup).toContain('bg-kumo-brand');
  });

  test('shows a dash when the sidecar has no quota for the account', () => {
    const markup = renderToStaticMarkup(
      createElement(
        I18nextProvider,
        { i18n },
        createElement(QuotaBars, { fiveHour: null, weekly: null, now: NOW })
      )
    );
    expect(markup).toContain('—');
    expect(markup).not.toContain('role="meter"');
  });
});
