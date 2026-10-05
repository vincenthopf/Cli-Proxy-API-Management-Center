import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { Button, Link, Tabs } from '@cloudflare/kumo';
import { sidecarApi, type UsageRange, type UsageResponse } from '@/services/api/sidecar';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { useThemeStore } from '@/stores';
import { usePolling } from './usePolling';
import { useNow } from './useNow';
import { sortAccounts, type AccountRecord } from './accounts';
import { formatCount, formatPercent, formatTokens } from './format';
import { PageHeader } from './components/PageHeader';
import { MetricCard } from './components/MetricCard';
import { StatusRail } from './components/StatusRail';
import { AddAccountButton } from '@/features/authFiles/addAccount/AddAccountButton';
import { AddAccountDialog } from '@/features/authFiles/addAccount/AddAccountDialog';
import { useAuthFileUpload } from '@/features/authFiles/hooks/useAuthFileUpload';
import { WaitingConversations } from '@/features/sessionGuard/WaitingConversations';

const RANGES: UsageRange[] = ['24h', '7d', '30d'];
const isRange = (value: string): value is UsageRange => (RANGES as string[]).includes(value);

interface Bucket {
  requests: number;
  tokens: number;
  cacheRatio: number;
  limited: number;
}

interface Accumulator {
  requests: number;
  tokens: number;
  read: number;
  denom: number;
  limited: number;
}

const toBuckets = (data: UsageResponse | null): Array<[number, Bucket]> => {
  if (!data) return [];
  const map = new Map<number, Accumulator>();
  for (const row of data.series) {
    const time = new Date(row.t).getTime();
    if (Number.isNaN(time)) continue;
    const cur = map.get(time) ?? { requests: 0, tokens: 0, read: 0, denom: 0, limited: 0 };
    cur.requests += row.requests;
    cur.tokens += row.input + row.output;
    cur.read += row.cache_read;
    cur.denom += row.input + row.cache_read + row.cache_creation;
    cur.limited += row.rate_limited;
    map.set(time, cur);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a - b)
    .map(([time, v]) => [
      time,
      {
        requests: v.requests,
        tokens: v.tokens,
        cacheRatio: v.denom > 0 ? (v.read / v.denom) * 100 : 0,
        limited: v.limited,
      },
    ]);
};

const rangeLabel = (data: UsageResponse | null): string => {
  if (!data || data.series.length === 0) return '';
  const times = data.series.map((row) => new Date(row.t).getTime()).filter((n) => !Number.isNaN(n));
  if (times.length === 0) return '';
  const fmt = (n: number) =>
    new Date(n).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${fmt(Math.min(...times))} – ${fmt(Math.max(...times))}`;
};

export function OverviewPage() {
  const { t } = useTranslation();
  const isDarkMode = useThemeStore((state) => state.resolvedTheme === 'dark');
  const [range, setRange] = useState<UsageRange>('24h');
  const accounts = usePolling(() => sidecarApi.accounts(), 30_000);
  const usage = usePolling(() => sidecarApi.usage(range, 'none'), 60_000, range);
  const router = usePolling(() => sidecarApi.router(), 60_000);
  const health = usePolling(() => sidecarApi.health(), 60_000);
  const now = useNow();

  const refreshAccounts = accounts.refresh;
  const refreshUsage = usage.refresh;
  const refreshRouter = router.refresh;
  const refreshHealth = health.refresh;
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshAccounts(), refreshUsage(), refreshRouter(), refreshHealth()]);
  }, [refreshAccounts, refreshUsage, refreshRouter, refreshHealth]);
  useHeaderRefresh(refreshAll);

  const rows = useMemo(
    () => sortAccounts((accounts.data?.accounts ?? []) as AccountRecord[]),
    [accounts.data]
  );
  const buckets = useMemo(() => toBuckets(usage.data), [usage.data]);
  const totals = usage.data?.totals;
  const daily = usage.data?.bucket === 'day';
  const sidecarError = health.error ?? (accounts.data ? null : accounts.error);
  const [refreshing, setRefreshing] = useState(false);
  const [addTarget, setAddTarget] = useState<string | null>(null);
  const { uploading, fileInputRef, handleUploadClick, handleFileChange } = useAuthFileUpload({
    onUploaded: () => refreshAccounts(),
  });
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  const series = (pick: (b: Bucket) => number): Array<[number, number]> =>
    buckets.map(([time, b]) => [time, pick(b)]);
  const chartLoading = usage.loading && !usage.data;
  const rangeText = t(`usage.range_${range}`);

  return (
    <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-6">
        <PageHeader
          title={t('overview.title')}
          description={t('overview.subtitle')}
          actions={
            <>
              <Button
                variant="secondary"
                icon={ArrowClockwiseIcon}
                loading={refreshing}
                onClick={() => void handleRefresh()}
              >
                {t('overview.refresh')}
              </Button>
              <AddAccountButton
                onAdd={setAddTarget}
                onUpload={handleUploadClick}
                uploading={uploading}
              />
            </>
          }
        />

        {sidecarError ? (
          <p className="-mt-3 text-sm text-kumo-subtle" role="status">
            {t('overview.sidecar_unreachable')}
          </p>
        ) : null}

        <WaitingConversations />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            variant="segmented"
            value={range}
            onValueChange={(value) => isRange(value) && setRange(value)}
            tabs={RANGES.map((value) => ({ value, label: t(`usage.range_${value}`) }))}
          />
          <span className="text-xs font-medium uppercase tracking-wide text-kumo-subtle">
            {rangeLabel(usage.data)}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <MetricCard
            label={t('overview.metric_requests')}
            value={formatCount(totals?.requests)}
            hint={t('overview.stat_failures', { count: totals?.failures ?? 0 })}
            points={series((b) => b.requests)}
            seriesName={t('overview.metric_requests')}
            daily={daily}
            isDarkMode={isDarkMode}
            colorIndex={0}
            formatValue={(v) => formatCount(v)}
            minInterval={1}
            description={t('overview.chart_requests', { range: rangeText })}
            loading={chartLoading}
          />
          <MetricCard
            label={t('overview.metric_tokens')}
            value={formatTokens((totals?.input ?? 0) + (totals?.output ?? 0))}
            hint={t('overview.stat_in_out', {
              input: formatTokens(totals?.input),
              output: formatTokens(totals?.output),
            })}
            points={series((b) => b.tokens)}
            seriesName={t('overview.metric_tokens')}
            daily={daily}
            isDarkMode={isDarkMode}
            colorIndex={1}
            formatValue={(v) => formatTokens(v)}
            minInterval={1}
            description={t('overview.chart_tokens', { range: rangeText })}
            loading={chartLoading}
          />
          <MetricCard
            label={t('overview.stat_cache')}
            value={formatPercent(totals ? totals.cache_hit_ratio * 100 : null, 1)}
            hint={t('overview.stat_cache_detail', {
              read: formatTokens(totals?.cache_read),
              write: formatTokens(totals?.cache_creation),
            })}
            points={series((b) => b.cacheRatio)}
            seriesName={t('overview.stat_cache')}
            daily={daily}
            isDarkMode={isDarkMode}
            colorIndex={2}
            formatValue={(v) => formatPercent(v)}
            minInterval={1}
            description={t('overview.chart_cache', { range: rangeText })}
            loading={chartLoading}
          />
          <MetricCard
            label={t('overview.metric_limited')}
            value={formatCount(totals?.rate_limited)}
            hint={t('overview.metric_limited_hint')}
            points={series((b) => b.limited)}
            seriesName={t('overview.metric_limited')}
            daily={daily}
            isDarkMode={isDarkMode}
            colorIndex={3}
            formatValue={(v) => formatCount(v)}
            minInterval={1}
            description={t('overview.chart_limited', { range: rangeText })}
            loading={chartLoading}
          />
        </div>

        <div className="text-sm">
          <Link href="/usage">{t('overview.view_usage')}</Link>
        </div>
      </div>

      <StatusRail accounts={rows} router={router.data ?? null} now={now} />
      <AddAccountDialog target={addTarget} onTargetChange={setAddTarget} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
    </div>
  );
}
