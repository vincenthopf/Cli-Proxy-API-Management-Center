export const formatTokens = (value: number | null | undefined): string => {
  const n = Number(value ?? 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export const formatCount = (value: number | null | undefined): string =>
  Math.round(Number(value ?? 0)).toLocaleString();

export const formatPercent = (value: number | null | undefined, digits = 0): string =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${value.toFixed(digits)}%`;

const parseTime = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  return Number.isNaN(time) ? null : time;
};

export const formatDuration = (ms: number): string => {
  const minutes = Math.round(Math.abs(ms) / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (minutes < 1) return 'now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  return `${days}d ${hours % 24}h`;
};

export const formatRelative = (iso: string | null | undefined, now = Date.now()): string => {
  const target = parseTime(iso);
  if (target === null) return '—';
  const diff = target - now;
  const text = formatDuration(diff);
  if (text === 'now') return text;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
};

export const formatDateTime = (iso: string | null | undefined): string => {
  const target = parseTime(iso);
  if (target === null) return '—';
  return new Date(target).toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
};

export const formatLocalTime = (iso: string | null | undefined): string => {
  const target = parseTime(iso);
  if (target === null) return '—';
  return new Date(target).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
};

export const formatLatency = (ms: number | null | undefined): string => {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const remainingTone = (remaining: number | null | undefined): 'ok' | 'warn' | 'low' => {
  if (remaining === null || remaining === undefined) return 'ok';
  if (remaining <= 10) return 'low';
  if (remaining <= 35) return 'warn';
  return 'ok';
};

export const maskEmail = (email: string | null | undefined): string => {
  if (!email) return '';
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const head = user.slice(0, 2);
  return `${head}${user.length > 2 ? '…' : ''}@${domain}`;
};

export const credentialName = (name: string | null | undefined): string =>
  (name ?? '').replace(/\.json$/i, '').replace(/^[a-z]+-(?:[0-9a-f]{6,}-)?/i, '');
