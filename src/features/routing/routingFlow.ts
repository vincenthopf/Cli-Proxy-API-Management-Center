import type { RouterState, SidecarAccount } from '@/services/api/sidecar';
import type { RoutingStrategy } from '@/types/visualConfig';
import { accountDisplayName, effectiveWindow } from '@/features/overview/accounts';
import { credentialName } from '@/features/overview/format';

export interface RoutingFlowSettings {
  strategy: RoutingStrategy;
  sessionAffinity: boolean;
  affinityTTL: string;
  subagentsShare: boolean;
}

export interface RoutingOrderEntry {
  key: string;
  rank: number;
  name: string;
  weeklyLeft: number | null;
  resetsAt: string | null;
}

export interface RoutingOrder {
  source: 'reset' | 'priority';
  entries: RoutingOrderEntry[];
  skipped: number;
}

const STRATEGIES: readonly RoutingStrategy[] = [
  'round-robin',
  'weighted-round-robin',
  'fill-first',
];

export const DEFAULT_ROUTING_FLOW_SETTINGS: RoutingFlowSettings = {
  strategy: 'round-robin',
  sessionAffinity: false,
  affinityTTL: '',
  subagentsShare: true,
};

export const STRATEGY_KEYS: Record<RoutingStrategy, string> = {
  'round-robin': 'round_robin',
  'weighted-round-robin': 'weighted',
  'fill-first': 'fill_first',
};

export const pickPath = (source: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
    source
  );

export const isRoutingStrategy = (value: unknown): value is RoutingStrategy =>
  typeof value === 'string' && (STRATEGIES as readonly string[]).includes(value);

export function readRoutingFlowSettings(
  raw: unknown,
  fallbackStrategy?: string | null
): RoutingFlowSettings {
  const strategy = pickPath(raw, ['routing', 'strategy']) ?? fallbackStrategy;
  const affinity = pickPath(raw, ['routing', 'session-affinity']);
  const ttl = pickPath(raw, ['routing', 'session-affinity-ttl']);
  const subagents = pickPath(raw, ['routing', 'session-affinity-subagents']);
  return {
    strategy: isRoutingStrategy(strategy) ? strategy : DEFAULT_ROUTING_FLOW_SETTINGS.strategy,
    sessionAffinity: typeof affinity === 'boolean' ? affinity : false,
    affinityTTL: typeof ttl === 'string' ? ttl.trim() : '',
    subagentsShare: typeof subagents === 'boolean' ? subagents : true,
  };
}

type AccountLike = Pick<
  SidecarAccount,
  'auth_index' | 'name' | 'email' | 'label' | 'disabled' | 'serving_rank' | 'seven_day'
>;

const displayName = (account: AccountLike | undefined, fallback: string) =>
  account ? account.email || accountDisplayName(account) : credentialName(fallback);

export function buildRoutingOrder(
  router: Pick<RouterState, 'mode' | 'ranking'> | null | undefined,
  accounts: readonly AccountLike[] | null | undefined,
  now: number
): RoutingOrder {
  const list = accounts ?? [];
  const byIndex = new Map(list.map((account) => [account.auth_index, account]));
  const entry = (
    key: string,
    rank: number,
    fallbackName: string,
    fallbackReset: string | null
  ): RoutingOrderEntry => {
    const account = byIndex.get(key);
    const weekly = account ? effectiveWindow(account.seven_day, now) : null;
    return {
      key,
      rank,
      name: displayName(account, fallbackName),
      weeklyLeft: weekly?.remaining ?? null,
      resetsAt: weekly ? weekly.resetsAt : fallbackReset,
    };
  };

  const ranking = router?.ranking ?? [];
  const fromRanking = () =>
    ranking
      .map((row, index) => ({ row, index }))
      .filter(({ row }) => row.eligible)
      .sort((a, b) => b.row.recommended_priority - a.row.recommended_priority || a.index - b.index)
      .map(({ row }, index) => entry(row.auth_index, index + 1, row.name, row.seven_day_resets_at));

  const total = Math.max(list.filter((account) => !account.disabled).length, ranking.length);

  if (router?.mode === 'active' && ranking.length > 0) {
    const entries = fromRanking();
    return { source: 'reset', entries, skipped: Math.max(0, total - entries.length) };
  }

  const serving = list
    .filter((account) => account.serving_rank !== null && !account.disabled)
    .sort((a, b) => (a.serving_rank ?? 0) - (b.serving_rank ?? 0))
    .map((account, index) => entry(account.auth_index, index + 1, account.name, null));
  const entries = serving.length > 0 ? serving : fromRanking();
  return { source: 'priority', entries, skipped: Math.max(0, total - entries.length) };
}
