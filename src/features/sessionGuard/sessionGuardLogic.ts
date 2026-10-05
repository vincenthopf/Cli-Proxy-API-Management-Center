import {
  accountDisplayName,
  accountStatus,
  effectiveWindow,
  type AccountRecord,
} from '@/features/overview/accounts';
import { credentialName } from '@/features/overview/format';

export type WaitingReason = 'limit' | 'paused' | 'unavailable' | 'removed' | 'available';

export interface WaitingReasonView {
  reason: WaitingReason;
  resetsAt: string | null;
}

export interface MoveTarget {
  authId: string;
  label: string;
}

const timeOf = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const value = new Date(iso).getTime();
  return Number.isNaN(value) ? null : value;
};

export const shortSessionId = (sessionId: string): string => sessionId.slice(0, 8);

export const targetLabel = (account: AccountRecord): string =>
  account.email || accountDisplayName(account);

export const findAccount = (
  accounts: readonly AccountRecord[],
  authId: string
): AccountRecord | undefined => accounts.find((account) => account.name === authId);

export const accountLabel = (
  accounts: readonly AccountRecord[],
  authId: string,
  fallback: string
): string => {
  const account = findAccount(accounts, authId);
  if (account) return targetLabel(account);
  return fallback || credentialName(authId);
};

const latest = (values: Array<string | null | undefined>, now: number): string | null => {
  let best: { iso: string; at: number } | null = null;
  for (const iso of values) {
    const at = timeOf(iso);
    if (iso && at !== null && at > now && (!best || at > best.at)) best = { iso, at };
  }
  return best?.iso ?? null;
};

const cooldownEnd = (account: AccountRecord, now: number): string | null =>
  latest(
    [
      account.cooldown_until,
      ...(account.cooldowns ?? []).map((cooldown) =>
        cooldown.retry_at
          ? cooldown.retry_at
          : cooldown.remaining_seconds
            ? new Date(now + cooldown.remaining_seconds * 1000).toISOString()
            : null
      ),
    ],
    now
  );

const quotaReset = (account: AccountRecord, now: number): string | null => {
  const windows = [
    effectiveWindow(account.five_hour, now),
    effectiveWindow(account.seven_day, now),
  ];
  return latest(
    windows.filter((w) => w.remaining !== null && w.remaining < 1).map((w) => w.resetsAt),
    now
  );
};

export function waitingReason(
  accounts: readonly AccountRecord[] | null,
  authId: string,
  now: number
): WaitingReasonView {
  if (!accounts) return { reason: 'limit', resetsAt: null };
  const account = findAccount(accounts, authId);
  if (!account) return { reason: 'removed', resetsAt: null };
  switch (accountStatus(account, now)) {
    case 'paused':
      return { reason: 'paused', resetsAt: null };
    case 'cooling':
      return { reason: 'limit', resetsAt: cooldownEnd(account, now) ?? quotaReset(account, now) };
    case 'exhausted':
      return { reason: 'limit', resetsAt: quotaReset(account, now) };
    case 'unavailable':
      return { reason: 'unavailable', resetsAt: null };
    default:
      return { reason: 'available', resetsAt: null };
  }
}

export function moveTargets(
  accounts: readonly AccountRecord[] | null,
  fromAuthId: string,
  now: number
): MoveTarget[] {
  return (accounts ?? [])
    .filter((account) => account.name !== fromAuthId)
    .filter((account) => (account.provider || 'claude').toLowerCase() === 'claude')
    .filter((account) => {
      const status = accountStatus(account, now);
      return status === 'serving' || status === 'standby';
    })
    .sort(
      (a, b) =>
        (a.serving_rank ?? Number.MAX_SAFE_INTEGER) - (b.serving_rank ?? Number.MAX_SAFE_INTEGER) ||
        b.priority - a.priority ||
        a.name.localeCompare(b.name)
    )
    .map((account) => ({ authId: account.name, label: targetLabel(account) }));
}

export const waitingSince = (firstSeen: string | null, fallbackSeconds: number, now: number) => {
  const at = timeOf(firstSeen);
  return at === null ? fallbackSeconds * 1000 : Math.max(0, now - at);
};
