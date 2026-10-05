import { Meter } from '@cloudflare/kumo';
import { useTranslation } from 'react-i18next';
import type { WindowView } from '../accounts';
import { formatPercent, remainingTone } from '../format';
import { ResetTime } from './ResetTime';

const INDICATOR_TONE = {
  ok: '',
  warn: 'from-kumo-warning via-kumo-warning to-kumo-warning',
  low: 'from-kumo-danger via-kumo-danger to-kumo-danger',
} as const;

interface QuotaMeterProps {
  view: WindowView;
  now: number;
}

export function QuotaMeter({ view, now }: QuotaMeterProps) {
  const { t } = useTranslation();
  if (view.remaining === null) {
    return <span className="text-xs text-kumo-subtle">{t('overview.no_quota_data')}</span>;
  }
  const remaining = Math.max(0, Math.min(100, view.remaining));
  const used = view.used === null ? 100 - remaining : Math.max(0, Math.min(100, view.used));
  return (
    <div className="flex min-w-36 flex-col gap-1">
      <Meter
        label={t('overview.quota_left', { value: formatPercent(remaining) })}
        customValue={t('overview.quota_used', { value: formatPercent(used) })}
        value={remaining}
        indicatorClassName={INDICATOR_TONE[remainingTone(remaining)]}
      />
      {view.reset ? (
        <span className="text-xs text-kumo-subtle">{t('overview.window_reset')}</span>
      ) : (
        <ResetTime iso={view.resetsAt} now={now} />
      )}
    </div>
  );
}
