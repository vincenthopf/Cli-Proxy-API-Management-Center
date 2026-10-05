import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowsSplitIcon,
  GearIcon,
  ListBulletsIcon,
  WarningCircleIcon,
} from '@phosphor-icons/react';
import { Badge, Banner, LinkButton, Radio, Text } from '@cloudflare/kumo';
import { sidecarApi, type RouterMode } from '@/services/api/sidecar';
import { useConfigStore } from '@/stores';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { usePolling } from '@/features/overview/usePolling';
import { useNow } from '@/features/overview/useNow';
import { accountDisplayName } from '@/features/overview/accounts';
import { credentialName, formatRelative, maskEmail } from '@/features/overview/format';
import { PageHeader } from '@/features/overview/components/PageHeader';
import { SectionHeader } from '@/features/overview/components/SectionHeader';
import { ResetTime } from '@/features/overview/components/ResetTime';
import { Panel, PanelEmpty } from '@/components/ui/Panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { RoutingFlow } from './components/RoutingFlow';
import { STRATEGY_KEYS, buildRoutingOrder, pickPath, readRoutingFlowSettings } from './routingFlow';

const MODES: RouterMode[] = ['active', 'shadow', 'off'];

const isMode = (value: unknown): value is RouterMode =>
  typeof value === 'string' && (MODES as string[]).includes(value);

export function RoutingPage() {
  const { t } = useTranslation();
  const router = usePolling(() => sidecarApi.router(), 30_000);
  const accounts = usePolling(() => sidecarApi.accounts(), 60_000);
  const config = useConfigStore((s) => s.config);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const now = useNow();
  const [saving, setSaving] = useState<RouterMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchConfig().catch(() => undefined);
  }, [fetchConfig]);

  const refreshRouter = router.refresh;
  const refreshAccounts = accounts.refresh;
  const refreshAll = useCallback(async () => {
    await Promise.all([refreshRouter(), refreshAccounts()]);
  }, [refreshRouter, refreshAccounts]);
  useHeaderRefresh(refreshAll);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of accounts.data?.accounts ?? []) {
      map.set(account.auth_index, accountDisplayName(account));
    }
    return map;
  }, [accounts.data]);
  const nameOf = (authIndex: string, fallback: string) =>
    names.get(authIndex) ?? (maskEmail(credentialName(fallback)) || credentialName(fallback));

  const ranking = router.data?.ranking ?? [];
  const mode = router.data?.mode;

  const boolText = (value: unknown) =>
    typeof value === 'boolean' ? (value ? t('routing.value_on') : t('routing.value_off')) : value;
  const raw = config?.raw ?? {};
  const flowSettings = useMemo(
    () => readRoutingFlowSettings(config?.raw, config?.routingStrategy),
    [config]
  );
  const order = useMemo(
    () =>
      router.data || accounts.data
        ? buildRoutingOrder(router.data, accounts.data?.accounts, now)
        : null,
    [accounts.data, now, router.data]
  );
  const settings: Array<[string, unknown]> = [
    [
      t('routing.strategy'),
      t(`settings.routing.strategies.${STRATEGY_KEYS[flowSettings.strategy]}.label`),
    ],
    [t('routing.affinity'), boolText(pickPath(raw, ['routing', 'session-affinity']))],
    [t('routing.affinity_ttl'), pickPath(raw, ['routing', 'session-affinity-ttl'])],
    [
      t('routing.affinity_subagents'),
      boolText(pickPath(raw, ['routing', 'session-affinity-subagents'])),
    ],
    [
      t('routing.retry'),
      pickPath(raw, ['routing', 'retry', 'request-retry']) ?? config?.requestRetry,
    ],
    [
      t('routing.model_cooling'),
      boolText(pickPath(raw, ['upstream', 'claude', 'model-level-cooling'])),
    ],
  ];

  const setMode = async (next: RouterMode) => {
    if (next === mode) return;
    setSaving(next);
    setError(null);
    try {
      await sidecarApi.setRouterMode(next);
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={t('routing.title')} description={t('routing.subtitle')} />

      {router.error && !router.data ? (
        <Banner
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          title={t('overview.alert_sidecar_title')}
          description={t('overview.sidecar_down', { error: router.error })}
        />
      ) : null}
      {error ? (
        <Banner
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          title={t('routing.mode_error_title')}
          description={error}
        />
      ) : null}

      <RoutingFlow
        title={t('routing.flow.title')}
        description={t('routing.flow.description')}
        settings={flowSettings}
        mode={mode}
        order={order}
        now={now}
        orderError={Boolean(router.error && accounts.error)}
        actions={
          <LinkButton
            variant="secondary"
            size="sm"
            icon={ListBulletsIcon}
            href="/logs?tab=decisions"
          >
            {t('routing.view_decisions')}
          </LinkButton>
        }
      />

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t('routing.router_title')}
          description={
            router.data?.last_run
              ? t('routing.last_run', { when: formatRelative(router.data.last_run, now) })
              : t('routing.router_help')
          }
        />
        <Radio.Group
          legend={t('routing.router_title')}
          appearance="card"
          orientation="horizontal"
          value={saving ?? mode ?? ''}
          disabled={saving !== null || !router.data}
          onValueChange={(value) => isMode(value) && void setMode(value)}
          className="[&_legend]:sr-only"
        >
          {MODES.map((item) => (
            <Radio.Item
              key={item}
              value={item}
              label={t(`routing.mode_${item}`)}
              description={t(`routing.mode_${item}_help`)}
            />
          ))}
        </Radio.Group>
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader title={t('routing.ranking_title')} description={t('routing.ranking_help')} />
        {ranking.length === 0 ? (
          <Panel padding="none">
            <PanelEmpty
              icon={<ArrowsSplitIcon size={32} className="text-kumo-inactive" />}
              title={t('overview.no_accounts')}
            />
          </Panel>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('routing.rank_col')}</TableHead>
                <TableHead>{t('overview.col_account')}</TableHead>
                <TableHead>{t('routing.weekly_reset')}</TableHead>
                <TableHead>{t('routing.eligibility')}</TableHead>
                <TableHead>{t('routing.current')}</TableHead>
                <TableHead>{t('routing.target')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((row, index) => {
                const changes = row.priority !== row.recommended_priority;
                return (
                  <TableRow key={row.auth_index}>
                    <TableCell className="font-medium tabular-nums">
                      {row.eligible ? `#${index + 1}` : '—'}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-kumo-default">
                        {nameOf(row.auth_index, row.name)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ResetTime
                        iso={row.seven_day_resets_at}
                        now={now}
                        className="text-sm text-kumo-default"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col items-start gap-1">
                        <Badge variant={row.eligible ? 'success' : 'warning'} appearance="dot">
                          {row.eligible ? t('routing.eligible') : t('routing.skipped')}
                        </Badge>
                        {row.reason && row.reason !== 'eligible' ? (
                          <span className="text-xs text-kumo-subtle">{row.reason}</span>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell className="tabular-nums">{row.priority}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-2 tabular-nums">
                        {row.recommended_priority}
                        {changes ? <Badge variant="info">{t('routing.will_change')}</Badge> : null}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <SectionHeader
          title={t('routing.proxy_title')}
          description={t('routing.proxy_help')}
          actions={
            <LinkButton variant="secondary" size="sm" icon={GearIcon} href="/settings/routing">
              {t('routing.edit_config')}
            </LinkButton>
          }
        />
        <Panel>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {settings.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <Text variant="secondary" size="xs" as="dt">
                  {label}
                </Text>
                <Text as="dd" bold>
                  {value === undefined || value === null || value === '' ? '—' : String(value)}
                </Text>
              </div>
            ))}
          </dl>
        </Panel>
      </section>
    </div>
  );
}
