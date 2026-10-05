import type { QuotaWindow, RouterState, SidecarAccount } from '@/services/api/sidecar';
import { credentialName } from './format';

export interface SidecarCooldown {
  scope?: string;
  model_key?: string;
  reason?: string;
  retry_at?: string | null;
  remaining_seconds?: number;
}

export type AccountRecord = SidecarAccount & { cooldowns?: SidecarCooldown[] };

export interface WindowView {
  used: number | null;
  remaining: number | null;
  resetsAt: string | null;
  reset: boolean;
}

export type AccountStatus =
  'serving' | 'standby' | 'cooling' | 'paused' | 'unavailable' | 'exhausted';

export type AccountAlert =
  | { kind: 'expiring'; name: string; remaining: number; resetsAt: string }
  | { kind: 'exhausted'; name: string; resetsAt: string | null };

export interface RouterDecision {
  ts: string | null;
  runId: string | null;
  authIndex: string;
  name: string;
  rank: number | null;
  action: string;
  reason: string;
  eligible: boolean;
  previousPriority: number | null;
  recommendedPriority: number | null;
  error: string | null;
}

const DAY_MS = 24 * 3600 * 1000;

const timeOf = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
};

export const accountDisplayName = (account: Pick<SidecarAccount, 'label' | 'email' | 'name'>) =>
  account.label || account.email || credentialName(account.name);

export const effectiveWindow = (
  window: QuotaWindow | null | undefined,
  now: number
): WindowView => {
  if (!window) return { used: null, remaining: null, resetsAt: null, reset: false };
  const resetAt = timeOf(window.resets_at);
  if (resetAt !== null && resetAt <= now) {
    return { used: 0, remaining: 100, resetsAt: null, reset: true };
  }
  const remaining =
    window.remaining ??
    (window.utilization === null ? null : Math.max(0, 100 - window.utilization));
  const used = window.utilization ?? (remaining === null ? null : Math.max(0, 100 - remaining));
  return { used, remaining, resetsAt: window.resets_at, reset: false };
};

export const isCoolingDown = (account: AccountRecord, now: number): boolean => {
  const until = timeOf(account.cooldown_until);
  if (until !== null && until > now) return true;
  return (account.cooldowns ?? []).some((cooldown) => {
    const retryAt = timeOf(cooldown.retry_at);
    if (retryAt !== null) return retryAt > now;
    return (cooldown.remaining_seconds ?? 0) > 0;
  });
};

export const isOutOfQuota = (account: AccountRecord, now: number): boolean => {
  const fiveHour = effectiveWindow(account.five_hour, now).remaining;
  const weekly = effectiveWindow(account.seven_day, now).remaining;
  return (fiveHour !== null && fiveHour < 1) || (weekly !== null && weekly < 1);
};

export const accountStatus = (account: AccountRecord, now: number): AccountStatus => {
  if (account.disabled) return 'paused';
  if (isCoolingDown(account, now)) return 'cooling';
  if (account.unavailable) return 'unavailable';
  if (isOutOfQuota(account, now)) return 'exhausted';
  if (account.serving_rank === 1) return 'serving';
  if (account.serving_rank) return 'standby';
  return 'exhausted';
};

export const sortAccounts = (accounts: AccountRecord[]): AccountRecord[] =>
  [...accounts].sort((a, b) => {
    const ar = a.serving_rank ?? Number.MAX_SAFE_INTEGER;
    const br = b.serving_rank ?? Number.MAX_SAFE_INTEGER;
    if (ar !== br) return ar - br;
    return (a.name || '').localeCompare(b.name || '');
  });

export const accountAlerts = (accounts: AccountRecord[], now: number): AccountAlert[] => {
  const alerts: AccountAlert[] = [];
  for (const account of accounts) {
    if (account.disabled) continue;
    const name = accountDisplayName(account);
    const weekly = effectiveWindow(account.seven_day, now);
    if (weekly.remaining === null) continue;
    const resetAt = timeOf(weekly.resetsAt);
    if (weekly.remaining > 1 && resetAt !== null && weekly.resetsAt) {
      const until = resetAt - now;
      if (until > 0 && until < DAY_MS) {
        alerts.push({
          kind: 'expiring',
          name,
          remaining: weekly.remaining,
          resetsAt: weekly.resetsAt,
        });
      }
    }
    if (weekly.remaining <= 1) {
      alerts.push({ kind: 'exhausted', name, resetsAt: weekly.resetsAt });
    }
  }
  return alerts;
};

const str = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const parseDecisions = (state: RouterState | null | undefined): RouterDecision[] =>
  (state?.decisions ?? [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object')
    .map((item) => ({
      ts: str(item.ts),
      runId: str(item.run_id),
      authIndex: str(item.auth_index) ?? '',
      name: str(item.name) ?? '',
      rank: num(item.rank),
      action: str(item.action) ?? 'unknown',
      reason: str(item.reason) ?? '',
      eligible: item.eligible === true,
      previousPriority: num(item.previous_priority),
      recommendedPriority: num(item.recommended_priority),
      error: str(item.error),
    }))
    .sort((a, b) => (timeOf(b.ts) ?? 0) - (timeOf(a.ts) ?? 0));
