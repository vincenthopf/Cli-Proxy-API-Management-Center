export const formatTokens = (value: number | null | undefined): string => {
  const n = Number(value ?? 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
};

export const formatPercent = (value: number | null | undefined, digits = 0): string =>
  value === null || value === undefined || Number.isNaN(value) ? '—' : `${value.toFixed(digits)}%`;

export const formatRelative = (iso: string | null | undefined, now = Date.now()): string => {
  if (!iso) return '—';
  const target = new Date(iso).getTime();
  if (Number.isNaN(target)) return '—';
  const diff = target - now;
  const abs = Math.abs(diff);
  const minutes = Math.round(abs / 60_000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  let text: string;
  if (minutes < 1) text = 'now';
  else if (minutes < 60) text = `${minutes}m`;
  else if (hours < 24) text = `${hours}h ${minutes % 60}m`;
  else text = `${days}d ${hours % 24}h`;
  if (text === 'now') return text;
  return diff >= 0 ? `in ${text}` : `${text} ago`;
};

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
  });
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
