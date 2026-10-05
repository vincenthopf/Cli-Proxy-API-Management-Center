import type { AuthFileItem } from '@/types';
import type { UsageGroup, UsageResponse } from '@/services/api/sidecar';
import { isCoolingDown, isOutOfQuota, type AccountRecord } from '@/features/overview/accounts';
import { getAuthFileStatusMessage, isProblemAuthFile } from '@/features/authFiles/constants';
import { summarizeCooldowns } from '@/features/authFiles/cooldowns';

export type AccountRowStatus =
  | { kind: 'serving' }
  | { kind: 'standby' }
  | { kind: 'ready' }
  | { kind: 'paused' }
  | { kind: 'cooling'; remainingMs: number | null }
  | { kind: 'exhausted' }
  | { kind: 'error'; reason: string };

export interface SidecarAccountIndex {
  byAuthIndex: Map<string, AccountRecord>;
  byName: Map<string, AccountRecord>;
  byEmail: Map<string, AccountRecord>;
}

const REASON_MAX_LENGTH = 48;

const timeOf = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
};

export const authIndexOf = (file: AuthFileItem): string | null => {
  const raw = file['auth_index'] ?? file.authIndex;
  if (typeof raw === 'string' && raw.trim()) return raw.trim();
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  return null;
};

export const indexSidecarAccounts = (accounts: AccountRecord[]): SidecarAccountIndex => {
  const byAuthIndex = new Map<string, AccountRecord>();
  const byName = new Map<string, AccountRecord>();
  const emailCounts = new Map<string, number>();
  const byEmail = new Map<string, AccountRecord>();
  for (const account of accounts) {
    if (account.auth_index) byAuthIndex.set(String(account.auth_index), account);
    if (account.name) byName.set(account.name, account);
    const email = account.email?.trim().toLowerCase();
    if (email) {
      emailCounts.set(email, (emailCounts.get(email) ?? 0) + 1);
      byEmail.set(email, account);
    }
  }
  for (const [email, count] of emailCounts) {
    if (count > 1) byEmail.delete(email);
  }
  return { byAuthIndex, byName, byEmail };
};

export const matchSidecarAccount = (
  file: AuthFileItem,
  index: SidecarAccountIndex
): AccountRecord | null => {
  const authIndex = authIndexOf(file);
  if (authIndex) {
    const match = index.byAuthIndex.get(authIndex);
    if (match) return match;
  }
  const byName = index.byName.get(file.name);
  if (byName) return byName;
  const email = typeof file.email === 'string' ? file.email.trim().toLowerCase() : '';
  return email ? (index.byEmail.get(email) ?? null) : null;
};

const sidecarCooldownMs = (account: AccountRecord, now: number): number | null => {
  const until = timeOf(account.cooldown_until);
  if (until !== null && until > now) return until - now;
  const pending = (account.cooldowns ?? [])
    .map((cooldown) => {
      const retryAt = timeOf(cooldown.retry_at);
      if (retryAt !== null) return retryAt - now;
      return (cooldown.remaining_seconds ?? 0) * 1000;
    })
    .filter((ms) => ms > 0);
  return pending.length ? Math.min(...pending) : null;
};

const shortReason = (reason: string): string =>
  reason.length > REASON_MAX_LENGTH ? `${reason.slice(0, REASON_MAX_LENGTH - 1)}…` : reason;

export const accountRowStatus = (
  file: AuthFileItem,
  account: AccountRecord | null,
  now: number
): AccountRowStatus => {
  if (file.disabled === true || account?.disabled) return { kind: 'paused' };

  if (account && isCoolingDown(account, now)) {
    return { kind: 'cooling', remainingMs: sidecarCooldownMs(account, now) };
  }
  if (file.cooldownSnapshot?.records?.length) {
    const summary = summarizeCooldowns(file.cooldownSnapshot, now);
    if (summary.credentialWide) {
      return { kind: 'cooling', remainingMs: summary.earliestSeconds * 1000 };
    }
  }

  if (isProblemAuthFile(file) || account?.unavailable) {
    return { kind: 'error', reason: shortReason(getAuthFileStatusMessage(file)) };
  }

  if (account && isOutOfQuota(account, now)) return { kind: 'exhausted' };
  if (account?.serving_rank === 1) return { kind: 'serving' };
  if (account?.serving_rank) return { kind: 'standby' };
  if (account && account.provider?.toLowerCase() === 'claude') return { kind: 'standby' };
  return { kind: 'ready' };
};

export const usageGroupFor = (
  usage: UsageResponse | null | undefined,
  key: string | null
): UsageGroup | null => {
  if (!usage || !key) return null;
  return usage.groups.find((group) => group.key === key) ?? null;
};

export const hourlyTokens = (
  usage: UsageResponse | null | undefined,
  key: string | null
): number[] => {
  if (!usage || !key) return [];
  return usage.series
    .filter((row) => row.key === key)
    .map((row) => ({ time: new Date(row.t).getTime(), tokens: row.input + row.output }))
    .filter((row) => !Number.isNaN(row.time))
    .sort((a, b) => a.time - b.time)
    .map((row) => row.tokens);
};
