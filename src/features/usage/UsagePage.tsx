import { useCallback, useMemo, useState, type ReactNode, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChartBarIcon,
  ListBulletsIcon,
  TerminalIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import {
  Badge,
  Banner,
  ChartLegend,
  ChartPalette,
  Empty,
  LayerCard,
  Table,
  Tabs,
  TimeseriesChart,
  type BadgeVariant,
} from '@cloudflare/kumo';
import {
  sidecarApi,
  type SidecarRequest,
  type UsageGroupBy,
  type UsageRange,
  type UsageResponse,
} from '@/services/api/sidecar';
import { useThemeStore } from '@/stores';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { usePolling } from '@/features/overview/usePolling';
import { useNow } from '@/features/overview/useNow';
import {
  formatCount,
  formatDateTime,
  formatLatency,
  formatPercent,
  formatRelative,
  formatTokens,
  maskEmail,
} from '@/features/overview/format';
import { PageHeader } from '@/features/overview/components/PageHeader';
import { SectionHeader } from '@/features/overview/components/SectionHeader';
import { StatCard, StatRow } from '@/features/overview/components/StatCard';
import { echarts } from './echarts';
import { useChartFont } from './useChartFont';

const RANGES: UsageRange[] = ['24h', '7d', '30d'];
const GROUPS: UsageGroupBy[] = ['account', 'model', 'session', 'client'];
const SERIES_KEYS = ['input', 'output', 'cache_read', 'cache_creation'] as const;

type SeriesKey = (typeof SERIES_KEYS)[number];

const isRange = (value: string): value is UsageRange => (RANGES as string[]).includes(value);
const isGroup = (value: string): value is UsageGroupBy => (GROUPS as string[]).includes(value);

function NoData({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <LayerCard>
      <LayerCard.Primary>
        <Empty size="sm" icon={icon} title={title} />
      </LayerCard.Primary>
    </LayerCard>
  );
}

function TokenChart({ data, isDarkMode }: { data: UsageResponse; isDarkMode: boolean }) {
  const { t } = useTranslation();
  const series = useMemo(() => {
    const buckets = new Map<number, Record<SeriesKey, number>>();
    for (const row of data.series) {
      const time = new Date(row.t).getTime();
      if (Number.isNaN(time)) continue;
      const current = buckets.get(time) ?? {
        input: 0,
        output: 0,
        cache_read: 0,
        cache_creation: 0,
      };
      for (const key of SERIES_KEYS) current[key] += Number(row[key] ?? 0);
      buckets.set(time, current);
    }
    const times = [...buckets.keys()].sort((a, b) => a - b);
    return SERIES_KEYS.map((key, index) => ({
      key,
      name: t(`usage.series_${key}`),
      color: ChartPalette.categorical(index, isDarkMode),
      data: times.map((time): [number, number] => [time, buckets.get(time)?.[key] ?? 0]),
      total: times.reduce((sum, time) => sum + (buckets.get(time)?.[key] ?? 0), 0),
    }));
  }, [data, isDarkMode, t]);

  const daily = data.bucket === 'day';
  const chartRef = useRef<HTMLDivElement>(null);
  useChartFont(chartRef, `${series.length}:${isDarkMode}:${data.series.length}`);
  return (
    <div className="flex flex-col gap-3" ref={chartRef}>
      <div className="flex flex-wrap gap-4">
        {series.map((item) => (
          <ChartLegend.SmallItem
            key={item.key}
            name={item.name}
            color={item.color}
            value={formatTokens(item.total)}
          />
        ))}
      </div>
      <TimeseriesChart
        echarts={echarts}
        isDarkMode={isDarkMode}
        type="bar"
        height={260}
        data={series.map(({ name, color, data: points }) => ({ name, color, data: points }))}
        xAxisTickFormat={(value) =>
          new Date(value).toLocaleString(
            undefined,
            daily ? { month: 'short', day: 'numeric' } : { hour: 'numeric', minute: '2-digit' }
          )
        }
        yAxisTickFormat={(value) => formatTokens(value)}
        tooltipValueFormat={(value) => formatTokens(value)}
        ariaDescription={t('usage.chart_description')}
      />
    </div>
  );
}

function ShareBar({ value }: { value: number }) {
  const width = Math.max(0, Math.min(100, value * 100));
  return (
    <div className="flex min-w-28 items-center gap-2">
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-kumo-fill" aria-hidden="true">
        <div className="h-full rounded-full bg-kumo-brand" style={{ width: `${width}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-kumo-default tabular-nums">
        {formatPercent(width)}
      </span>
    </div>
  );
}

const requestBadge = (request: SidecarRequest): BadgeVariant => {
  if (request.status_code === 429) return 'warning';
  if (request.failed || (request.status_code !== null && request.status_code >= 400))
    return 'error';
  return 'success';
};

export function UsagePage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<UsageRange>('24h');
  const [group, setGroup] = useState<UsageGroupBy>('account');
  const isDarkMode = useThemeStore((state) => state.resolvedTheme === 'dark');
  const now = useNow();
  const usage = usePolling(() => sidecarApi.usage(range, group), 60_000, `${range}:${group}`);
  const sessions = usePolling(() => sidecarApi.sessions(25), 60_000);
  const requests = usePolling(() => sidecarApi.requests(50), 30_000);
  const totals = usage.data?.totals;

  const refreshUsage = usage.refresh;
  const refreshSessions = sessions.refresh;
  const refreshRequests = requests.refresh;
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshUsage(), refreshSessions(), refreshRequests()]);
  }, [refreshUsage, refreshSessions, refreshRequests]);
  useHeaderRefresh(refreshAll);

  const groups = usage.data?.groups ?? [];
  const sessionRows = sessions.data?.sessions ?? [];
  const requestRows = requests.data?.requests ?? [];
  const hasSeries = (usage.data?.series.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('usage.title')}
        description={t('usage.subtitle')}
        actions={
          <Tabs
            variant="segmented"
            value={range}
            onValueChange={(value) => isRange(value) && setRange(value)}
            tabs={RANGES.map((value) => ({ value, label: t(`usage.range_${value}`) }))}
          />
        }
      />

      {usage.error && !usage.data ? (
        <Banner
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          title={t('overview.alert_sidecar_title')}
          description={t('overview.sidecar_down', { error: usage.error })}
        />
      ) : null}

      <StatRow>
        <StatCard
          label={t('usage.input')}
          value={formatTokens(totals?.input)}
          hint={t('overview.requests_count', { count: totals?.requests ?? 0 })}
        />
        <StatCard
          label={t('usage.output')}
          value={formatTokens(totals?.output)}
          hint={t('overview.failures_count', { count: totals?.failures ?? 0 })}
        />
        <StatCard
          label={t('usage.cache_read')}
          value={formatTokens(totals?.cache_read)}
          hint={t('usage.hit_ratio', {
            value: formatPercent(totals ? totals.cache_hit_ratio * 100 : null),
          })}
        />
        <StatCard
          label={t('usage.cache_write')}
          value={formatTokens(totals?.cache_creation)}
          hint={t('usage.rate_limited', { count: totals?.rate_limited ?? 0 })}
        />
      </StatRow>

      <section className="flex flex-col gap-3">
        <SectionHeader title={t('usage.tokens_over_time')} />
        {usage.data && !hasSeries ? (
          <NoData
            icon={<ChartBarIcon size={32} className="text-kumo-inactive" />}
            title={t('usage.no_data')}
          />
        ) : (
          <LayerCard>
            <LayerCard.Primary>
              {usage.data ? (
                <TokenChart data={usage.data} isDarkMode={isDarkMode} />
              ) : (
                <TimeseriesChart echarts={echarts} data={[]} height={260} loading />
              )}
            </LayerCard.Primary>
          </LayerCard>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t('usage.breakdown')}
          actions={
            <Tabs
              variant="segmented"
              size="sm"
              value={group}
              onValueChange={(value) => isGroup(value) && setGroup(value)}
              tabs={GROUPS.map((value) => ({ value, label: t(`usage.group_${value}`) }))}
            />
          }
        />
        {groups.length === 0 ? (
          <NoData
            icon={<ChartBarIcon size={32} className="text-kumo-inactive" />}
            title={t('usage.no_data')}
          />
        ) : (
          <LayerCard className="overflow-x-auto p-0">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>{t(`usage.group_${group}`)}</Table.Head>
                  <Table.Head>{t('usage.in_out')}</Table.Head>
                  <Table.Head>{t('usage.cache')}</Table.Head>
                  <Table.Head>{t('usage.requests')}</Table.Head>
                  <Table.Head>{t('usage.share')}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {groups.map((row) => (
                  <Table.Row key={row.key}>
                    <Table.Cell>
                      <span className="font-medium text-kumo-default" title={row.key}>
                        {group === 'account'
                          ? maskEmail(row.label) || row.label
                          : row.label || row.key}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        <span>{formatTokens(row.input + row.output)}</span>
                        <span className="text-xs text-kumo-subtle">
                          {formatTokens(row.input)} / {formatTokens(row.output)}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        <span>{formatPercent(row.cache_hit_ratio * 100)}</span>
                        <span className="text-xs text-kumo-subtle">
                          {t('usage.read_write', {
                            read: formatTokens(row.cache_read),
                            write: formatTokens(row.cache_creation),
                          })}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col gap-0.5 tabular-nums">
                        <span>{formatCount(row.requests)}</span>
                        {row.failures > 0 || row.rate_limited > 0 ? (
                          <span className="text-xs text-kumo-subtle">
                            {[
                              row.failures > 0
                                ? t('overview.failures_count', { count: row.failures })
                                : '',
                              row.rate_limited > 0
                                ? t('usage.rate_limited', { count: row.rate_limited })
                                : '',
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        ) : null}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <ShareBar value={row.share} />
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </LayerCard>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title={t('usage.sessions')} />
        {sessionRows.length === 0 ? (
          <NoData
            icon={<TerminalIcon size={32} className="text-kumo-inactive" />}
            title={t('usage.no_sessions')}
          />
        ) : (
          <LayerCard className="overflow-x-auto p-0">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>{t('usage.session')}</Table.Head>
                  <Table.Head>{t('usage.in_out')}</Table.Head>
                  <Table.Head>{t('usage.cache')}</Table.Head>
                  <Table.Head>{t('usage.requests')}</Table.Head>
                  <Table.Head>{t('usage.last')}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {sessionRows.map((session) => (
                  <Table.Row key={session.session_id}>
                    <Table.Cell>
                      <div className="flex min-w-40 flex-col gap-0.5">
                        <span
                          className="font-mono text-sm text-kumo-default"
                          title={session.session_id}
                        >
                          {session.session_id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-kumo-subtle">
                          {[
                            session.models.join(', '),
                            session.accounts.map((a) => maskEmail(a) || a).join(', '),
                          ]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {formatTokens(session.input + session.output)}
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {formatPercent(session.cache_hit_ratio * 100)}
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {formatCount(session.requests)}
                    </Table.Cell>
                    <Table.Cell>
                      <span
                        className="text-sm text-kumo-subtle"
                        title={formatDateTime(session.last_at)}
                      >
                        {formatRelative(session.last_at, now)}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </LayerCard>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title={t('usage.recent_requests')} />
        {requestRows.length === 0 ? (
          <NoData
            icon={<ListBulletsIcon size={32} className="text-kumo-inactive" />}
            title={t('usage.no_requests')}
          />
        ) : (
          <LayerCard className="overflow-x-auto p-0">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.Head>{t('usage.model_account')}</Table.Head>
                  <Table.Head>{t('usage.in_out')}</Table.Head>
                  <Table.Head>{t('usage.cache')}</Table.Head>
                  <Table.Head>{t('usage.status')}</Table.Head>
                  <Table.Head>{t('usage.latency')}</Table.Head>
                  <Table.Head>{t('usage.when')}</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {requestRows.map((request, index) => (
                  <Table.Row key={`${request.request_id}-${index}`}>
                    <Table.Cell>
                      <div className="flex min-w-40 flex-col gap-0.5">
                        <span className="text-kumo-default">{request.model}</span>
                        <span className="text-xs text-kumo-subtle">
                          {maskEmail(request.account) || request.account}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {formatTokens(request.input_tokens)} / {formatTokens(request.output_tokens)}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-xs text-kumo-subtle tabular-nums">
                        {t('usage.read_write', {
                          read: formatTokens(request.cache_read_tokens),
                          write: formatTokens(request.cache_creation_tokens),
                        })}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={requestBadge(request)}>
                        {request.status_code ??
                          (request.failed ? t('usage.failed') : t('usage.ok'))}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell className="tabular-nums">
                      {formatLatency(request.latency_ms)}
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-sm text-kumo-subtle" title={formatDateTime(request.ts)}>
                        {formatRelative(request.ts, now)}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table>
          </LayerCard>
        )}
      </section>
    </div>
  );
}
