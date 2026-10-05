import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import type { AccountRecord } from '@/features/overview/accounts';
import { RoutingFlow } from '@/features/routing/components/RoutingFlow';
import {
  moveTargets,
  shortSessionId,
  waitingReason,
  waitingSince,
} from '@/features/sessionGuard/sessionGuardLogic';
import { normalizeSessionGuardStatus } from '@/services/api/sessionGuard';
import { escapeText, renderSection, translations } from './helpers/settingsRender';

const NOW = Date.parse('2026-10-06T00:00:00Z');

const window = (remaining: number, resetsAt: string) => ({
  utilization: 100 - remaining,
  remaining,
  resets_at: resetsAt,
  observed_at: null,
  source: 'poll' as const,
});

const account = (
  name: string,
  email: string,
  overrides: Partial<AccountRecord> = {}
): AccountRecord => ({
  auth_index: name,
  name,
  email,
  provider: 'claude',
  label: null,
  disabled: false,
  unavailable: false,
  priority: 90,
  recommended_priority: null,
  serving_rank: 2,
  cooldown_until: null,
  five_hour: window(80, '2026-10-06T05:00:00Z'),
  seven_day: window(80, '2026-10-08T00:00:00Z'),
  last_served_at: null,
  requests_24h: 0,
  failures_24h: 0,
  tokens_24h: { input: 0, output: 0, cache_read: 0, cache_creation: 0 },
  ...overrides,
});

const A = 'claude-0fc99dad-a@example.test.json';
const B = 'claude-87ab6339-b@example.test.json';
const C = 'claude-11111111-c@example.test.json';

describe('session guard status', () => {
  test('normalizes the plugin status payload', () => {
    const status = normalizeSessionGuardStatus({
      mode: 'auto',
      pending: [
        {
          session_id: 'f71d49e2-5549-40de-8bab-93dc9b4c928b',
          from_auth_id: B,
          from_label: 'b@example.test',
          first_seen: '2026-10-05T23:55:00Z',
          last_seen: '2026-10-05T23:59:00Z',
          last_model: 'claude-sonnet-5-5',
          request_count: 2,
          waiting_seconds: 300,
        },
        { from_auth_id: A },
      ],
      approved: [],
      bindings_count: 3,
      recent_transfers: [{ session_id: 's', from_auth_id: B, to_auth_id: A, reason: 'approved' }],
    });
    expect(status.mode).toBe('auto');
    expect(status.pending).toHaveLength(1);
    expect(status.pending[0]).toMatchObject({ fromAuthId: B, requestCount: 2 });
    expect(status.bindingsCount).toBe(3);
    expect(status.recentTransfers[0]?.toAuthId).toBe(A);
    expect(normalizeSessionGuardStatus(null).mode).toBe('confirm');
  });
});

describe('session guard logic', () => {
  test('explains why a conversation waits', () => {
    const accounts = [
      account(A, 'a@example.test', { serving_rank: 1, priority: 100 }),
      account(B, 'b@example.test', {
        serving_rank: null,
        cooldown_until: '2026-10-06T02:00:00Z',
      }),
      account(C, 'c@example.test', { disabled: true }),
    ];
    expect(waitingReason(accounts, B, NOW)).toEqual({
      reason: 'limit',
      resetsAt: '2026-10-06T02:00:00Z',
    });
    expect(waitingReason(accounts, C, NOW).reason).toBe('paused');
    expect(waitingReason(accounts, 'gone.json', NOW).reason).toBe('removed');
    expect(waitingReason(accounts, A, NOW).reason).toBe('available');
    expect(waitingReason(null, A, NOW).reason).toBe('limit');
  });

  test('offers the current first account and skips unusable ones', () => {
    const accounts = [
      account(C, 'c@example.test', { serving_rank: 2, priority: 90 }),
      account(A, 'a@example.test', { serving_rank: 1, priority: 100 }),
      account(B, 'b@example.test', { serving_rank: null, cooldown_until: '2026-10-06T02:00:00Z' }),
      account('claude-x-d@example.test.json', 'd@example.test', { disabled: true }),
    ];
    expect(moveTargets(accounts, B, NOW).map((target) => target.label)).toEqual([
      'a@example.test',
      'c@example.test',
    ]);
    expect(moveTargets(accounts, A, NOW).map((target) => target.authId)).toEqual([C]);
    expect(moveTargets(null, B, NOW)).toEqual([]);
  });

  test('formats short ids and waiting time', () => {
    expect(shortSessionId('f71d49e2-5549-40de-8bab-93dc9b4c928b')).toBe('f71d49e2');
    expect(waitingSince('2026-10-05T23:55:00Z', 0, NOW)).toBe(5 * 60_000);
    expect(waitingSince(null, 90, NOW)).toBe(90_000);
  });
});

describe('routing flow limit step', () => {
  const settings = {
    strategy: 'fill-first' as const,
    sessionAffinity: true,
    affinityTTL: '1h',
    subagentsShare: true,
  };

  test('says the conversation waits for approval in confirm mode', () => {
    const markup = renderSection(
      createElement(RoutingFlow, {
        settings,
        mode: 'active',
        guardMode: 'confirm',
        order: null,
        now: NOW,
      })
    );
    expect(markup).toContain(escapeText(translations.t('routing.flow.limit_wait_approval')));
    expect(markup).not.toContain(escapeText(translations.t('routing.flow.limit_move_stay')));
  });

  test('says the conversation moves in auto mode', () => {
    const markup = renderSection(
      createElement(RoutingFlow, {
        settings,
        mode: 'active',
        guardMode: 'auto',
        order: null,
        now: NOW,
      })
    );
    expect(markup).toContain(escapeText(translations.t('routing.flow.limit_move_stay')));
    expect(markup).not.toContain(escapeText(translations.t('routing.flow.limit_wait_approval')));
  });
});
