import { useTranslation } from 'react-i18next';
import { cn } from '@cloudflare/kumo';
import type { QuotaWindow } from '@/services/api/sidecar';
import { effectiveWindow, type WindowView } from '../accounts';
import { formatDuration, formatPercent, formatResetClock, remainingTone } from '../format';

const BAR_TONE = {
  ok: 'bg-kumo-brand',
  warn: 'bg-kumo-warning',
  low: 'bg-kumo-danger',
} as const;

interface QuotaBarProps {
  label: string;
  view: WindowView;
  now: number;
  compact: boolean;
}

function QuotaBar({ label, view, now, compact }: QuotaBarProps) {
  const { t } = useTranslation();
  const textSize = compact ? 'text-xs' : 'text-sm';
  if (view.remaining === null) {
    return (
      <div className={cn('flex items-baseline justify-between gap-3', textSize)}>
        <span className="text-kumo-default">{label}</span>
        <span className="text-kumo-subtle">{t('overview.no_quota_data')}</span>
      </div>
    );
  }
  const remaining = Math.max(0, Math.min(100, view.remaining));
  const leftText = t('overview.quota_left', { value: formatPercent(remaining) });
  const target = view.resetsAt ? new Date(view.resetsAt).getTime() : Number.NaN;
  const resetText = view.reset
    ? t('overview.window_reset')
    : Number.isNaN(target)
      ? t('overview.no_reset')
      : t('overview.rail_resets', {
          when: formatDuration(target - now),
          time: formatResetClock(view.resetsAt),
        });
  return (
    <div className={cn('flex flex-col', compact ? 'gap-0.5' : 'gap-1')}>
      <div className={cn('flex items-baseline justify-between gap-3', textSize)}>
        <span className="text-kumo-default">{label}</span>
        <span className="font-medium whitespace-nowrap text-kumo-strong tabular-nums">
          {leftText}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-kumo-fill"
        role="meter"
        aria-label={`${label}: ${leftText}. ${resetText}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(remaining)}
        aria-valuetext={leftText}
      >
        <div
          className={cn('h-full rounded-full', BAR_TONE[remainingTone(remaining)])}
          style={{ width: `${remaining}%` }}
        />
      </div>
      <span className="text-xs text-kumo-subtle">{resetText}</span>
    </div>
  );
}

export interface QuotaBarsProps {
  fiveHour: QuotaWindow | null | undefined;
  weekly: QuotaWindow | null | undefined;
  now: number;
  compact?: boolean;
  emptyText?: string;
  className?: string;
}

export function QuotaBars({
  fiveHour,
  weekly,
  now,
  compact = false,
  emptyText = '—',
  className,
}: QuotaBarsProps) {
  const { t } = useTranslation();
  const fiveHourView = effectiveWindow(fiveHour, now);
  const weeklyView = effectiveWindow(weekly, now);
  if (fiveHourView.remaining === null && weeklyView.remaining === null) {
    return <span className={cn('text-sm text-kumo-subtle', className)}>{emptyText}</span>;
  }
  return (
    <div className={cn('flex flex-col', compact ? 'min-w-44 gap-2' : 'gap-3', className)}>
      <QuotaBar
        label={t('overview.col_five_hour')}
        view={fiveHourView}
        now={now}
        compact={compact}
      />
      <QuotaBar label={t('overview.col_weekly')} view={weeklyView} now={now} compact={compact} />
    </div>
  );
}
