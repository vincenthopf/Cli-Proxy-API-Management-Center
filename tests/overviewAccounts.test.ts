import { describe, expect, test } from 'bun:test';
import {
  accountStatus,
  effectiveWindow,
  parseDecisions,
  type AccountRecord,
} from '../src/features/overview/accounts';
import { credentialName } from '../src/features/overview/format';
import type { RouterState } from '../src/services/api/sidecar';

const NOW = Date.parse('2026-10-05T12:00:00Z');
const hours = (n: number) => new Date(NOW + n * 3600_000).toISOString();

const window = (remaining: number | null, resetsAt: string | null) => ({
  utilization: remaining === null ? null : 100 - remaining,
  remaining,
  resets_at: resetsAt,
  observed_at: null,
  source: 'poll' as const,
});

const account = (overrides: Partial<AccountRecord> = {}): AccountRecord => ({
  auth_index: 'a1',
  name: 'claude-0fc99dad-user@example.com.json',
  email: 'user@example.com',
  provider: 'claude',
  label: null,
  disabled: false,
  unavailable: false,
  priority: 100,
  recommended_priority: 100,
  serving_rank: 1,
  cooldown_until: null,
  cooldowns: [],
  five_hour: window(90, hours(2)),
  seven_day: window(50, hours(72)),
  last_served_at: null,
  requests_24h: 0,
  failures_24h: 0,
  tokens_24h: { input: 0, output: 0, cache_read: 0, cache_creation: 0 },
  ...overrides,
});

describe('effectiveWindow', () => {
  test('treats a window past its reset as unused', () => {
    expect(effectiveWindow(window(3, hours(-1)), NOW)).toEqual({
      used: 0,
      remaining: 100,
      resetsAt: null,
      reset: true,
    });
  });

  test('keeps used and remaining for an open window', () => {
    const view = effectiveWindow(window(30, hours(5)), NOW);
    expect(view.used).toBe(70);
    expect(view.remaining).toBe(30);
    expect(view.reset).toBe(false);
  });
});

describe('accountStatus', () => {
  test('serving, standby, paused', () => {
    expect(accountStatus(account(), NOW)).toBe('serving');
    expect(accountStatus(account({ serving_rank: 2 }), NOW)).toBe('standby');
    expect(accountStatus(account({ disabled: true }), NOW)).toBe('paused');
  });

  test('cooldown entries mark the account as cooling down', () => {
    expect(
      accountStatus(account({ cooldowns: [{ reason: 'quota', retry_at: hours(1) }] }), NOW)
    ).toBe('cooling');
    expect(
      accountStatus(account({ cooldowns: [{ reason: 'quota', retry_at: hours(-1) }] }), NOW)
    ).toBe('serving');
  });

  test('an empty open window is out of quota but a reset window is not', () => {
    expect(accountStatus(account({ five_hour: window(0, hours(1)) }), NOW)).toBe('exhausted');
    expect(accountStatus(account({ five_hour: window(0, hours(-1)) }), NOW)).toBe('serving');
  });
});

describe('parseDecisions', () => {
  test('normalizes and sorts newest first', () => {
    const state: RouterState = {
      mode: 'active',
      last_run: null,
      ranking: [],
      decisions: [
        { ts: hours(-2), auth_index: 'a', action: 'unchanged', rank: 2 },
        { ts: hours(-1), auth_index: 'b', action: 'updated', previous_priority: 90 },
        null as unknown as Record<string, unknown>,
      ],
    };
    const parsed = parseDecisions(state);
    expect(parsed.map((d) => d.authIndex)).toEqual(['b', 'a']);
    expect(parsed[0].previousPriority).toBe(90);
    expect(parsed[1].rank).toBe(2);
  });
});

describe('credentialName', () => {
  test('strips provider prefix, hash and extension', () => {
    expect(credentialName('claude-0fc99dad-user@example.com.json')).toBe('user@example.com');
    expect(credentialName('user@example.com.json')).toBe('user@example.com');
  });
});
