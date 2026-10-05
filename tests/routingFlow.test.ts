import { describe, expect, test } from 'bun:test';
import { createElement } from 'react';
import type { RouterState, SidecarAccount } from '@/services/api/sidecar';
import { RoutingFlow } from '@/features/routing/components/RoutingFlow';
import { buildRoutingOrder, readRoutingFlowSettings } from '@/features/routing/routingFlow';
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
  authIndex: string,
  email: string,
  servingRank: number | null,
  remaining: number,
  disabled = false
): SidecarAccount => ({
  auth_index: authIndex,
  name: `${authIndex}.json`,
  email,
  provider: 'claude',
  label: null,
  disabled,
  unavailable: false,
  priority: 0,
  recommended_priority: null,
  serving_rank: servingRank,
  cooldown_until: null,
  five_hour: window(100, '2026-10-06T05:00:00Z'),
  seven_day: window(remaining, '2026-10-08T00:00:00Z'),
  last_served_at: null,
  requests_24h: 0,
  failures_24h: 0,
  tokens_24h: { input: 0, output: 0, cache_read: 0, cache_creation: 0 },
});

const ranking: RouterState['ranking'] = [
  {
    auth_index: 'b',
    name: 'b.json',
    eligible: true,
    reason: 'eligible',
    seven_day_resets_at: '2026-10-07T00:00:00Z',
    priority: 99,
    recommended_priority: 100,
  },
  {
    auth_index: 'a',
    name: 'a.json',
    eligible: true,
    reason: 'eligible',
    seven_day_resets_at: '2026-10-08T00:00:00Z',
    priority: 100,
    recommended_priority: 99,
  },
  {
    auth_index: 'c',
    name: 'c.json',
    eligible: false,
    reason: 'disabled',
    seven_day_resets_at: null,
    priority: 0,
    recommended_priority: 0,
  },
];

const accounts = [
  account('a', 'a@example.test', 1, 40),
  account('b', 'b@example.test', 2, 70),
  account('c', 'c@example.test', null, 10, true),
];

describe('routing order', () => {
  test('follows the reset-aware ranking when ordering is active', () => {
    const order = buildRoutingOrder({ mode: 'active', ranking }, accounts, NOW);
    expect(order.source).toBe('reset');
    expect(order.entries.map((entry) => [entry.rank, entry.name, entry.weeklyLeft])).toEqual([
      [1, 'b@example.test', 70],
      [2, 'a@example.test', 40],
    ]);
    expect(order.skipped).toBe(1);
  });

  test('follows the serving rank when ordering is not active', () => {
    const order = buildRoutingOrder({ mode: 'shadow', ranking }, accounts, NOW);
    expect(order.source).toBe('priority');
    expect(order.entries.map((entry) => entry.name)).toEqual(['a@example.test', 'b@example.test']);
  });

  test('reads proxy routing settings with server defaults', () => {
    expect(readRoutingFlowSettings({})).toEqual({
      strategy: 'round-robin',
      sessionAffinity: false,
      affinityTTL: '',
      subagentsShare: true,
    });
    expect(
      readRoutingFlowSettings({
        routing: {
          strategy: 'fill-first',
          'session-affinity': true,
          'session-affinity-ttl': ' 1h ',
          'session-affinity-subagents': false,
        },
      })
    ).toEqual({
      strategy: 'fill-first',
      sessionAffinity: true,
      affinityTTL: '1h',
      subagentsShare: false,
    });
  });
});

describe('routing flow', () => {
  test('explains the live settings and lists the account order', () => {
    const markup = renderSection(
      createElement(RoutingFlow, {
        settings: {
          strategy: 'fill-first',
          sessionAffinity: true,
          affinityTTL: '1h',
          subagentsShare: true,
        },
        mode: 'active',
        order: buildRoutingOrder({ mode: 'active', ranking }, accounts, NOW),
        now: NOW,
      })
    );
    for (const key of [
      'routing.flow.request_title',
      'routing.flow.affinity_yes',
      'routing.flow.subagents_share',
      'routing.flow.pick_reset_order',
      'routing.flow.limit_move_stay',
      'routing.flow.limit_pause',
    ]) {
      expect(markup).toContain(escapeText(translations.t(key)));
    }
    expect(markup.indexOf('b@example.test')).toBeLessThan(markup.indexOf('a@example.test'));
    expect(markup).toContain(
      escapeText(translations.t('routing.flow.weekly_left', { percent: '70%' }))
    );
  });

  test('says when session affinity is off', () => {
    const markup = renderSection(
      createElement(RoutingFlow, {
        settings: {
          strategy: 'round-robin',
          sessionAffinity: false,
          affinityTTL: '',
          subagentsShare: true,
        },
        mode: 'off',
        order: null,
        now: NOW,
      })
    );
    expect(markup).toContain(escapeText(translations.t('routing.flow.affinity_off')));
    expect(markup).toContain(escapeText(translations.t('routing.flow.pick_rotate_title')));
    expect(markup).not.toContain(escapeText(translations.t('routing.flow.subagents_share')));
  });
});
