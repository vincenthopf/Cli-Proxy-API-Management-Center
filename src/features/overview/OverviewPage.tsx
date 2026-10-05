import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { sidecarApi, type SidecarAccount, type QuotaWindow } from '@/services/api/sidecar';
import { usePolling } from './usePolling';
import {
  formatDateTime,
  formatPercent,
  formatRelative,
  formatTokens,
  maskEmail,
  remainingTone,
} from './format';
import styles from './Overview.module.scss';

function QuotaCell({ window, label }: { window: QuotaWindow; label: string }) {
  const remaining = window.remaining;
  const tone = remainingTone(remaining);
  const width = remaining === null ? 0 : Math.max(0, Math.min(100, remaining));
  return (
    <div className={styles.quota}>
      <div className={styles.quotaTop}>
        <span className={styles.quotaLabel}>{label}</span>
        <span className={styles.quotaValue}>{formatPercent(remaining)}</span>
      </div>
      <div className={styles.bar} aria-hidden="true">
        <div className={`${styles.barFill} ${styles[`tone_${tone}`]}`} style={{ width: `${width}%` }} />
      </div>
      <div className={styles.quotaReset} title={formatDateTime(window.resets_at)}>
        {window.resets_at ? formatRelative(window.resets_at) : '—'}
      </div>
    </div>
  );
}

function statusOf(account: SidecarAccount, t: (key: string) => string, now: number) {
  if (account.disabled) return { text: t('overview.status_paused'), tone: 'muted' };
  if (account.cooldown_until && new Date(account.cooldown_until).getTime() > now) {
    return { text: t('overview.status_cooling'), tone: 'warn' };
  }
  if (account.unavailable) return { text: t('overview.status_unavailable'), tone: 'low' };
  if (account.serving_rank === 1) return { text: t('overview.status_serving'), tone: 'ok' };
  if (account.serving_rank) return { text: t('overview.status_standby'), tone: 'muted' };
  return { text: t('overview.status_exhausted'), tone: 'low' };
}

export function OverviewPage() {
  const { t } = useTranslation();
  const accounts = usePolling(() => sidecarApi.accounts(), 30_000);
  const usage = usePolling(() => sidecarApi.usage('24h', 'none'), 60_000);
  const router = usePolling(() => sidecarApi.router(), 60_000);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const rows = useMemo(() => {
    const list = accounts.data?.accounts ?? [];
    return [...list].sort((a, b) => {
      const ar = a.serving_rank ?? 999;
      const br = b.serving_rank ?? 999;
      if (ar !== br) return ar - br;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [accounts.data]);

  const alerts = useMemo(() => {
    const out: string[] = [];
    const day = 24 * 3600 * 1000;
    for (const a of rows) {
      const name = a.label || maskEmail(a.email) || a.name;
      const wk = a.seven_day;
      if (wk.remaining !== null && wk.remaining > 1 && wk.resets_at) {
        const until = new Date(wk.resets_at).getTime() - now;
        if (until > 0 && until < day) {
          out.push(
            t('overview.alert_expiring', {
              name,
              remaining: formatPercent(wk.remaining),
              when: formatRelative(wk.resets_at, now),
            })
          );
        }
      }
      if (wk.remaining !== null && wk.remaining <= 1) {
        out.push(t('overview.alert_exhausted', { name, when: formatRelative(wk.resets_at) }));
      }
    }
    if (router.data && router.data.mode !== 'active') {
      out.push(t('overview.alert_router_off', { mode: router.data.mode }));
    }
    return out;
  }, [rows, router.data, t, now]);

  const totals = usage.data?.totals;
  const sidecarDown = Boolean(accounts.error) && !accounts.data;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('overview.title')}</h1>
          <p className={styles.subtitle}>{t('overview.subtitle')}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => {
          void accounts.refresh();
          void usage.refresh();
          void router.refresh();
        }}>
          {t('overview.refresh')}
        </Button>
      </header>

      {sidecarDown ? (
        <div className={styles.notice}>{t('overview.sidecar_down', { error: accounts.error })}</div>
      ) : null}

      {alerts.length > 0 ? (
        <ul className={styles.alerts}>
          {alerts.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
      ) : null}

      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('overview.stat_requests')}</span>
          <span className={styles.statValue}>{formatTokens(totals?.requests)}</span>
          <span className={styles.statHint}>
            {t('overview.stat_failures', { count: totals?.failures ?? 0 })}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('overview.stat_tokens')}</span>
          <span className={styles.statValue}>
            {formatTokens((totals?.input ?? 0) + (totals?.output ?? 0))}
          </span>
          <span className={styles.statHint}>
            {t('overview.stat_in_out', {
              input: formatTokens(totals?.input),
              output: formatTokens(totals?.output),
            })}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('overview.stat_cache')}</span>
          <span className={styles.statValue}>
            {formatPercent(totals ? totals.cache_hit_ratio * 100 : null)}
          </span>
          <span className={styles.statHint}>
            {t('overview.stat_cache_detail', {
              read: formatTokens(totals?.cache_read),
              write: formatTokens(totals?.cache_creation),
            })}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('overview.stat_limited')}</span>
          <span className={styles.statValue}>{totals?.rate_limited ?? 0}</span>
          <span className={styles.statHint}>{t('overview.stat_last_24h')}</span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('overview.accounts_title')}</h2>
          <div className={styles.sectionLinks}>
            <Link to="/routing">{t('overview.link_routing')}</Link>
            <Link to="/oauth">{t('overview.link_add')}</Link>
          </div>
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <span>{t('overview.col_account')}</span>
            <span>{t('overview.col_five_hour')}</span>
            <span>{t('overview.col_weekly')}</span>
            <span>{t('overview.col_24h')}</span>
            <span>{t('overview.col_priority')}</span>
          </div>
          {rows.length === 0 && !accounts.loading ? (
            <div className={styles.empty}>{t('overview.no_accounts')}</div>
          ) : null}
          {rows.map((a) => {
            const status = statusOf(a, t, now);
            return (
              <div className={styles.row} key={a.auth_index}>
                <div className={styles.account}>
                  <span className={styles.accountName}>
                    {a.label || maskEmail(a.email) || a.name}
                  </span>
                  <span className={styles.accountMeta}>
                    <span className={`${styles.dot} ${styles[`dot_${status.tone}`]}`} />
                    {status.text}
                    <span className={styles.sep}>·</span>
                    {a.provider}
                    {a.last_served_at ? (
                      <>
                        <span className={styles.sep}>·</span>
                        {t('overview.last_served', { when: formatRelative(a.last_served_at) })}
                      </>
                    ) : null}
                  </span>
                </div>
                <QuotaCell window={a.five_hour} label={t('overview.remaining')} />
                <QuotaCell window={a.seven_day} label={t('overview.remaining')} />
                <div className={styles.usage}>
                  <span>{formatTokens(a.tokens_24h.input + a.tokens_24h.output)}</span>
                  <span className={styles.usageMeta}>
                    {t('overview.requests_count', { count: a.requests_24h })}
                    {a.failures_24h > 0
                      ? ` · ${t('overview.failures_count', { count: a.failures_24h })}`
                      : ''}
                  </span>
                </div>
                <div className={styles.priority}>
                  <span>{a.serving_rank ? `#${a.serving_rank}` : '—'}</span>
                  <span className={styles.usageMeta}>{a.priority}</span>
                </div>
              </div>
            );
          })}
        </div>
        <p className={styles.footnote}>{t('overview.footnote')}</p>
      </section>
    </div>
  );
}
