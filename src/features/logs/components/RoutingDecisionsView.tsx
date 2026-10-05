import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowsClockwiseIcon, ListBulletsIcon, WarningCircleIcon } from '@phosphor-icons/react';
import {
  Badge,
  Banner,
  Button,
  LinkButton,
  Switch,
  Text,
  type BadgeVariant,
} from '@cloudflare/kumo';
import { sidecarApi } from '@/services/api/sidecar';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { usePolling } from '@/features/overview/usePolling';
import { useNow } from '@/features/overview/useNow';
import { accountDisplayName, parseDecisions } from '@/features/overview/accounts';
import {
  credentialName,
  formatDateTime,
  formatRelative,
  maskEmail,
} from '@/features/overview/format';
import { Panel, PanelEmpty } from '@/components/ui/Panel';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';

const UNCHANGED = 'unchanged';

const actionBadge = (action: string, error: string | null): BadgeVariant => {
  if (error) return 'error';
  if (action === UNCHANGED) return 'neutral';
  if (action === 'skipped') return 'warning';
  return 'info';
};

export function RoutingDecisionsView() {
  const { t } = useTranslation();
  const router = usePolling(() => sidecarApi.router(), 30_000);
  const accounts = usePolling(() => sidecarApi.accounts(), 60_000);
  const now = useNow();
  const [changesOnly, setChangesOnly] = useState(true);

  const refreshRouter = router.refresh;
  const refreshAccounts = accounts.refresh;
  const refresh = useCallback(async () => {
    await Promise.all([refreshRouter(), refreshAccounts()]);
  }, [refreshAccounts, refreshRouter]);
  useHeaderRefresh(refresh);

  const names = useMemo(() => {
    const map = new Map<string, string>();
    for (const account of accounts.data?.accounts ?? []) {
      map.set(account.auth_index, accountDisplayName(account));
    }
    return map;
  }, [accounts.data]);
  const nameOf = (authIndex: string, fallback: string) =>
    names.get(authIndex) ?? (maskEmail(credentialName(fallback)) || credentialName(fallback));

  const all = useMemo(() => parseDecisions(router.data), [router.data]);
  const decisions = changesOnly
    ? all.filter((decision) => decision.action !== UNCHANGED || decision.error)
    : all;
  const mode = router.data?.mode;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <Text variant="heading" as="h2">
              {t('logs.decisions_title')}
            </Text>
            {mode ? (
              <Badge variant={mode === 'active' ? 'info' : 'neutral'}>
                {t('logs.decisions_mode', { mode: t(`routing.mode_${mode}`) })}
              </Badge>
            ) : null}
          </div>
          <Text variant="secondary" size="sm">
            {router.data?.last_run
              ? t('logs.decisions_description_last_run', {
                  when: formatRelative(router.data.last_run, now),
                })
              : t('logs.decisions_description')}
          </Text>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Switch
            size="sm"
            label={t('logs.decisions_changes_only')}
            checked={changesOnly}
            onCheckedChange={setChangesOnly}
          />
          <LinkButton variant="secondary" size="sm" href="/routing">
            {t('logs.decisions_open_routing')}
          </LinkButton>
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowsClockwiseIcon />}
            loading={router.loading && router.data !== null}
            onClick={() => void refresh()}
          >
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {router.error && !router.data ? (
        <Banner
          variant="error"
          icon={<WarningCircleIcon weight="fill" />}
          title={t('overview.alert_sidecar_title')}
          description={t('overview.sidecar_down', { error: router.error })}
        />
      ) : null}

      {decisions.length === 0 ? (
        <Panel padding="none">
          <PanelEmpty
            icon={<ListBulletsIcon size={32} className="text-kumo-inactive" />}
            title={
              router.loading && !router.data
                ? t('common.loading')
                : changesOnly && all.length > 0
                  ? t('logs.decisions_no_changes')
                  : t('logs.decisions_empty')
            }
          />
        </Panel>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('logs.decisions_col_time')}</TableHead>
              <TableHead>{t('logs.decisions_col_account')}</TableHead>
              <TableHead>{t('logs.decisions_col_action')}</TableHead>
              <TableHead>{t('logs.decisions_col_priority')}</TableHead>
              <TableHead>{t('logs.decisions_col_reason')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {decisions.map((decision, index) => (
              <TableRow key={`${decision.runId ?? 'run'}-${decision.authIndex}-${index}`}>
                <TableCell>
                  <span
                    className="whitespace-nowrap text-sm text-kumo-subtle"
                    title={formatDateTime(decision.ts)}
                  >
                    {formatRelative(decision.ts, now)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-kumo-default">
                      {nameOf(decision.authIndex, decision.name)}
                    </span>
                    {decision.rank ? (
                      <span className="text-xs text-kumo-subtle">
                        {t('routing.rank', { rank: decision.rank })}
                      </span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={actionBadge(decision.action, decision.error)}>
                      {decision.action}
                    </Badge>
                    {decision.error ? (
                      <span className="text-xs text-kumo-danger">{decision.error}</span>
                    ) : null}
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap tabular-nums">
                  {decision.previousPriority ?? '—'} → {decision.recommendedPriority ?? '—'}
                </TableCell>
                <TableCell>
                  <span className="text-sm text-kumo-subtle">{decision.reason || '—'}</span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
