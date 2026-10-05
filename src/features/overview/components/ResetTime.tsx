import { Tooltip } from '@cloudflare/kumo';
import { useTranslation } from 'react-i18next';
import { formatDuration, formatLocalTime } from '../format';

interface ResetTimeProps {
  iso: string | null | undefined;
  now: number;
  className?: string;
}

export function ResetTime({ iso, now, className }: ResetTimeProps) {
  const { t } = useTranslation();
  const target = iso ? new Date(iso).getTime() : Number.NaN;
  if (!iso || Number.isNaN(target)) {
    return (
      <span className={className ?? 'text-xs text-kumo-subtle'}>{t('overview.no_reset')}</span>
    );
  }
  const diff = target - now;
  const label =
    diff > 0
      ? t('overview.resets_in', { when: formatDuration(diff) })
      : t('overview.reset_ago', { when: formatDuration(diff) });
  return (
    <Tooltip
      content={t('overview.resets_at', { time: formatLocalTime(iso) })}
      render={
        <span
          tabIndex={0}
          className={`${className ?? 'text-xs text-kumo-subtle'} cursor-help underline decoration-dotted underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-kumo-brand`}
        />
      }
    >
      {label}
    </Tooltip>
  );
}
