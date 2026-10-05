import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Link, type BadgeVariant } from '@cloudflare/kumo';
import type { RouterState } from '@/services/api/sidecar';
import {
  accountDisplayName,
  accountStatus,
  type AccountRecord,
  type AccountStatus,
} from '../accounts';
import { QuotaBars } from './QuotaBars';

const STATUS_BADGE: Record<AccountStatus, BadgeVariant> = {
  serving: 'success',
  standby: 'neutral',
  cooling: 'warning',
  paused: 'neutral',
  unavailable: 'error',
  exhausted: 'error',
};

function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-kumo-line py-5 first:pt-0 last:border-b-0">
      <h2 className="text-base font-semibold text-kumo-strong">{title}</h2>
      {children}
    </section>
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
                  <QuotaBars
                    fiveHour={account.five_hour}
                    weekly={account.seven_day}
                    now={now}
                    emptyText={t('overview.no_quota_data')}
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
            <Link href="/auth-files?add=other">{t('overview.add_account')}</Link>
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
