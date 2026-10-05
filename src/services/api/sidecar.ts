import { useAuthStore } from '@/stores';

export interface QuotaWindow {
  utilization: number | null;
  remaining: number | null;
  resets_at: string | null;
  observed_at: string | null;
  source: 'passive' | 'poll' | null;
}

export interface TokenTotals {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
}

export interface SidecarAccount {
  auth_index: string;
  name: string;
  email: string;
  provider: string;
  label: string | null;
  disabled: boolean;
  unavailable: boolean;
  priority: number;
  recommended_priority: number | null;
  serving_rank: number | null;
  cooldown_until: string | null;
  five_hour: QuotaWindow;
  seven_day: QuotaWindow;
  last_served_at: string | null;
  requests_24h: number;
  failures_24h: number;
  tokens_24h: TokenTotals;
}

export interface UsageRow extends TokenTotals {
  requests: number;
  failures: number;
  rate_limited: number;
}

export interface UsageGroup extends UsageRow {
  key: string;
  label: string;
  cache_hit_ratio: number;
  share: number;
}

export interface UsageResponse {
  range: UsageRange;
  bucket: 'hour' | 'day';
  totals: UsageRow & { cache_hit_ratio: number };
  series: Array<UsageRow & { t: string; key: string }>;
  groups: UsageGroup[];
}

export interface SidecarSession extends TokenTotals {
  session_id: string;
  started_at: string;
  last_at: string;
  accounts: string[];
  models: string[];
  requests: number;
  failures: number;
  cache_hit_ratio: number;
}

export interface SidecarRequest {
  ts: string;
  request_id: string;
  account: string;
  model: string;
  session_id: string | null;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_creation_tokens: number;
  latency_ms: number | null;
  status_code: number | null;
  failed: boolean;
}

export type RouterMode = 'off' | 'shadow' | 'active';

export interface RouterRankingRow {
  auth_index: string;
  name: string;
  eligible: boolean;
  reason: string;
  seven_day_resets_at: string | null;
  priority: number;
  recommended_priority: number;
}

export interface RouterState {
  mode: RouterMode;
  last_run: string | null;
  ranking: RouterRankingRow[];
  decisions: Array<Record<string, unknown>>;
}

export interface SidecarHealth {
  ok: boolean;
  version: string;
  last_usage_poll: string | null;
  last_snapshot: string | null;
  last_quota_poll: string | null;
  last_router_run: string | null;
  router_mode: RouterMode;
}

export type UsageRange = '24h' | '7d' | '30d';
export type UsageGroupBy = 'account' | 'model' | 'client' | 'session' | 'none';

const sidecarBase = () => {
  const { apiBase } = useAuthStore.getState();
  return `${apiBase.replace(/\/+$/, '')}/sidecar/v1`;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { managementKey } = useAuthStore.getState();
  const response = await fetch(`${sidecarBase()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${managementKey}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Sidecar ${path} returned ${response.status}`);
  }
  return (await response.json()) as T;
}

export const sidecarApi = {
  health: () => request<SidecarHealth>('/health'),
  accounts: () => request<{ accounts: SidecarAccount[] }>('/accounts'),
  usage: (range: UsageRange, group: UsageGroupBy) =>
    request<UsageResponse>(`/usage?range=${range}&group=${group}`),
  sessions: (limit = 50) => request<{ sessions: SidecarSession[] }>(`/sessions?limit=${limit}`),
  requests: (limit = 100) => request<{ requests: SidecarRequest[] }>(`/requests?limit=${limit}`),
  router: () => request<RouterState>('/router'),
  setRouterMode: (mode: RouterMode) =>
    request<RouterState>('/router', { method: 'POST', body: JSON.stringify({ mode }) }),
};
