import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowClockwiseIcon,
  PlusIcon,
  UsersIcon,
  WarningCircleIcon,
  WarningIcon,
  InfoIcon,
} from '@phosphor-icons/react';
import {
  Badge,
  Banner,
  Button,
  Empty,
  LayerCard,
  LinkButton,
  Table,
  Text,
  type BadgeVariant,
} from '@cloudflare/kumo';
import { sidecarApi } from '@/services/api/sidecar';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { usePolling } from './usePolling';
import { useNow } from './useNow';
import {
  accountAlerts,
  accountDisplayName,
  accountStatus,
  effectiveWindow,
  sortAccounts,
  type AccountRecord,
  type AccountStatus,
} from './accounts';
import { formatCount, formatPercent, formatRelative, formatTokens } from './format';
import { PageHeader } from './components/PageHeader';
import { SectionHeader } from './components/SectionHeader';
import { StatCard, StatRow } from './components/StatCard';
import { QuotaMeter } from './components/QuotaMeter';
import { ResetTime } from './components/ResetTime';

const STATUS_BADGE: Record<AccountStatus, BadgeVariant> = {
  serving: 'success',
  standby: 'neutral',
  cooling: 'warning',
  paused: 'neutral',
  unavailable: 'error',
  exhausted: 'error',
};

function AccountsTable({ rows, now }: { rows: AccountRecord[]; now: number }) {
  const { t } = useTranslation();
  return (
    <LayerCard className="overflow-x-auto p-0">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.Head>{t('overview.col_account')}</Table.Head>
            <Table.Head>{t('overview.col_status')}</Table.Head>
            <Table.Head>{t('overview.col_five_hour')}</Table.Head>
            <Table.Head>{t('overview.col_weekly')}</Table.Head>
            <Table.Head>{t('overview.col_24h')}</Table.Head>
            <Table.Head>{t('overview.col_priority')}</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {rows.map((account) => {
            const status = accountStatus(account, now);
            return (
              <Table.Row key={account.auth_index}>
                <Table.Cell>
                  <div className="flex min-w-40 flex-col gap-0.5">
                    <span className="font-medium text-kumo-default">
                      {accountDisplayName(account)}
                    </span>
                    <span className="text-xs text-kumo-subtle">
                      {account.provider}
                      {account.last_served_at
                        ? ` · ${t('overview.last_served', {
                            when: formatRelative(account.last_served_at, now),
                          })}`
                        : ''}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={STATUS_BADGE[status]} appearance="dot">
                      {t(`overview.status_${status}`)}
                    </Badge>
                    {status === 'cooling' && account.cooldown_until ? (
                      <ResetTime iso={account.cooldown_until} now={now} />
                    ) : null}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <QuotaMeter view={effectiveWindow(account.five_hour, now)} now={now} />
                </Table.Cell>
                <Table.Cell>
                  <QuotaMeter view={effectiveWindow(account.seven_day, now)} now={now} />
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-0.5 tabular-nums">
                    <span className="text-kumo-default">
                      {formatTokens(account.tokens_24h.input + account.tokens_24h.output)}
                    </span>
                    <span className="text-xs text-kumo-subtle">
                      {t('overview.requests_count', { count: account.requests_24h })}
                      {account.failures_24h > 0
                        ? ` · ${t('overview.failures_count', { count: account.failures_24h })}`
                        : ''}
                    </span>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-0.5 tabular-nums">
                    <span className="font-medium text-kumo-default">
                      {account.serving_rank ? `#${account.serving_rank}` : '—'}
                    </span>
                    <span className="text-xs text-kumo-subtle">
                      {t('overview.priority_value', { value: account.priority })}
                    </span>
                  </div>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </LayerCard>
  );
}

export function OverviewPage() {
  const { t } = useTranslation();
  const accounts = usePolling(() => sidecarApi.accounts(), 30_000);
  const usage = usePolling(() => sidecarApi.usage('24h', 'none'), 60_000);
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
  const alerts = useMemo(() => accountAlerts(rows, now), [rows, now]);
  const totals = usage.data?.totals;
  const sidecarError = health.error ?? (accounts.data ? null : accounts.error);
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshAll();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
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
            <LinkButton variant="primary" icon={PlusIcon} href="/oauth">
              {t('overview.add_account')}
            </LinkButton>
          </>
        }
      />

      {sidecarError || alerts.length > 0 || (router.data && router.data.mode !== 'active') ? (
        <div className="flex flex-col gap-3">
          {sidecarError ? (
            <Banner
              variant="error"
              icon={<WarningCircleIcon weight="fill" />}
              title={t('overview.alert_sidecar_title')}
              description={t('overview.sidecar_down', { error: sidecarError })}
            />
          ) : null}
          {alerts.map((alert) =>
            alert.kind === 'expiring' ? (
              <Banner
                key={`expiring-${alert.name}`}
                variant="alert"
                icon={<WarningIcon weight="fill" />}
                title={t('overview.alert_expiring_title', { name: alert.name })}
                description={t('overview.alert_expiring', {
                  remaining: formatPercent(alert.remaining),
                  when: formatRelative(alert.resetsAt, now),
                })}
              />
            ) : (
              <Banner
                key={`exhausted-${alert.name}`}
                variant="error"
                icon={<WarningCircleIcon weight="fill" />}
                title={t('overview.alert_exhausted_title', { name: alert.name })}
                description={t('overview.alert_exhausted', {
                  when: formatRelative(alert.resetsAt, now),
                })}
              />
            )
          )}
          {router.data && router.data.mode !== 'active' ? (
            <Banner
              variant="secondary"
              icon={<InfoIcon weight="fill" />}
              title={t('overview.alert_router_title')}
              description={t('overview.alert_router_off', {
                mode: t(`routing.mode_${router.data.mode}`),
              })}
              action={
                <LinkButton variant="secondary" size="sm" href="/routing">
                  {t('overview.link_routing')}
                </LinkButton>
              }
            />
          ) : null}
        </div>
      ) : null}

      <StatRow>
        <StatCard
          label={t('overview.stat_requests')}
          value={formatCount(totals?.requests)}
          hint={t('overview.stat_failures', { count: totals?.failures ?? 0 })}
        />
        <StatCard
          label={t('overview.stat_tokens')}
          value={formatTokens((totals?.input ?? 0) + (totals?.output ?? 0))}
          hint={t('overview.stat_in_out', {
            input: formatTokens(totals?.input),
            output: formatTokens(totals?.output),
          })}
        />
        <StatCard
          label={t('overview.stat_cache')}
          value={formatPercent(totals ? totals.cache_hit_ratio * 100 : null)}
          hint={t('overview.stat_cache_detail', {
            read: formatTokens(totals?.cache_read),
            write: formatTokens(totals?.cache_creation),
          })}
        />
        <StatCard
          label={t('overview.stat_limited')}
          value={formatCount(totals?.rate_limited)}
          hint={t('overview.stat_last_24h')}
        />
      </StatRow>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t('overview.accounts_title')}
          description={t('overview.footnote')}
          actions={
            <LinkButton variant="ghost" size="sm" href="/routing">
              {t('overview.link_routing')}
            </LinkButton>
          }
        />
        {rows.length === 0 && !accounts.loading ? (
          <LayerCard>
            <LayerCard.Primary>
              <Empty
                icon={<UsersIcon size={48} className="text-kumo-inactive" />}
                title={t('overview.empty_title')}
                description={t('overview.no_accounts')}
                contents={
                  <LinkButton variant="primary" icon={PlusIcon} href="/oauth">
                    {t('overview.add_account')}
                  </LinkButton>
                }
              />
            </LayerCard.Primary>
          </LayerCard>
        ) : (
          <AccountsTable rows={rows} now={now} />
        )}
        {rows.length > 0 ? (
          <Text variant="secondary" size="xs">
            {t('overview.hover_hint')}
          </Text>
        ) : null}
      </section>
    </div>
  );
}
