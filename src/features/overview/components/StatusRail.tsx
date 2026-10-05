import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Link, type BadgeVariant } from '@cloudflare/kumo';
import type { RouterState } from '@/services/api/sidecar';
import {
  accountDisplayName,
  accountStatus,
  effectiveWindow,
  type AccountRecord,
  type AccountStatus,
  type WindowView,
} from '../accounts';
import { formatDuration, formatLocalTime, formatPercent, remainingTone } from '../format';

const STATUS_BADGE: Record<AccountStatus, BadgeVariant> = {
  serving: 'success',
  standby: 'neutral',
  cooling: 'warning',
  paused: 'neutral',
  unavailable: 'error',
  exhausted: 'error',
};

const BAR_TONE = {
  ok: 'bg-kumo-brand',
  warn: 'bg-kumo-warning',
  low: 'bg-kumo-danger',
} as const;

function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-kumo-line py-5 first:pt-0 last:border-b-0">
      <h2 className="text-base font-semibold text-kumo-strong">{title}</h2>
      {children}
    </section>
  );
}

function WindowLine({ label, view, now }: { label: string; view: WindowView; now: number }) {
  const { t } = useTranslation();
  if (view.remaining === null) {
    return (
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-kumo-default">{label}</span>
        <span className="text-kumo-subtle">{t('overview.no_quota_data')}</span>
      </div>
    );
  }
  const remaining = Math.max(0, Math.min(100, view.remaining));
  const target = view.resetsAt ? new Date(view.resetsAt).getTime() : Number.NaN;
  const resetText = view.reset
    ? t('overview.window_reset')
    : Number.isNaN(target)
      ? t('overview.no_reset')
      : t('overview.rail_resets', {
          when: formatDuration(target - now),
          time: formatLocalTime(view.resetsAt),
        });
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-kumo-default">{label}</span>
        <span className="font-medium tabular-nums text-kumo-strong">
          {t('overview.quota_left', { value: formatPercent(remaining) })}
        </span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-kumo-fill"
        role="meter"
        aria-label={`${label} ${t('overview.quota_left', { value: formatPercent(remaining) })}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(remaining)}
      >
        <div
          className={`h-full rounded-full ${BAR_TONE[remainingTone(remaining)]}`}
          style={{ width: `${remaining}%` }}
        />
      </div>
      <span className="text-xs text-kumo-subtle">{resetText}</span>
    </div>
  );
}

interface StatusRailProps {
  accounts: AccountRecord[];
  router: RouterState | null;
  now: number;
}

export function StatusRail({ accounts, router, now }: StatusRailProps) {
  const { t } = useTranslation();
  const serving = accounts.find((a) => a.serving_rank === 1);
  return (
    <aside
      aria-label={t('overview.rail_label')}
      className="flex flex-col xl:border-l xl:border-kumo-line xl:pl-8"
    >
      <RailSection title={t('overview.accounts_title')}>
        {accounts.length === 0 ? (
          <p className="text-sm text-kumo-subtle">{t('overview.no_accounts')}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-kumo-line">
            {accounts.map((account) => {
              const status = accountStatus(account, now);
              return (
                <li key={account.auth_index} className="flex flex-col gap-3 py-4 first:pt-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-medium text-kumo-strong">
                        {accountDisplayName(account)}
                      </span>
                      <span className="text-xs text-kumo-subtle">
                        {account.serving_rank
                          ? t('overview.rail_order', { rank: account.serving_rank })
                          : t('overview.rail_not_in_order')}
                      </span>
                    </div>
                    <Badge variant={STATUS_BADGE[status]} appearance="dot">
                      {t(`overview.status_${status}`)}
                    </Badge>
                  </div>
                  <WindowLine
                    label={t('overview.col_five_hour')}
                    view={effectiveWindow(account.five_hour, now)}
                    now={now}
                  />
                  <WindowLine
                    label={t('overview.col_weekly')}
                    view={effectiveWindow(account.seven_day, now)}
                    now={now}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <Link href="/auth-files" className="text-sm">
          {t('overview.rail_manage_accounts')}
        </Link>
      </RailSection>

      <RailSection title={t('overview.rail_routing')}>
        <dl className="flex flex-col divide-y divide-kumo-line text-sm">
          <div className="flex items-center justify-between gap-3 pb-2">
            <dt className="text-kumo-default">{t('overview.rail_mode')}</dt>
            <dd>
              {router ? (
                <Badge variant={router.mode === 'active' ? 'success' : 'warning'}>
                  {t(`routing.mode_${router.mode}`)}
                </Badge>
              ) : (
                <span className="text-kumo-subtle">—</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5 pt-2">
            <dt className="text-kumo-default">{t('overview.rail_serving')}</dt>
            <dd className="break-all font-medium text-kumo-strong">
              {serving ? accountDisplayName(serving) : t('overview.rail_none')}
            </dd>
          </div>
        </dl>
        <Link href="/routing" className="text-sm">
          {t('overview.rail_open_routing')}
        </Link>
      </RailSection>

      <RailSection title={t('overview.rail_shortcuts')}>
        <ul className="flex flex-col gap-2 text-sm">
          <li>
            <Link href="/oauth">{t('overview.add_account')}</Link>
          </li>
          <li>
            <Link href="/connect">{t('overview.rail_connect')}</Link>
          </li>
          <li>
            <Link href="/usage">{t('overview.rail_usage')}</Link>
          </li>
          <li>
            <Link href="/settings">{t('overview.rail_settings')}</Link>
          </li>
        </ul>
      </RailSection>
    </aside>
  );
}
