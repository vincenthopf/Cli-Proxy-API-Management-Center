import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  sidecarApi,
  type UsageGroupBy,
  type UsageRange,
  type UsageResponse,
} from '@/services/api/sidecar';
import { usePolling } from '@/features/overview/usePolling';
import {
  formatDateTime,
  formatPercent,
  formatRelative,
  formatTokens,
  maskEmail,
} from '@/features/overview/format';
import styles from '@/features/overview/Overview.module.scss';

const RANGES: UsageRange[] = ['24h', '7d', '30d'];
const GROUPS: UsageGroupBy[] = ['account', 'model', 'session', 'client'];
const SERIES = [
  { key: 'input', color: 'var(--series-1)' },
  { key: 'output', color: 'var(--series-2)' },
  { key: 'cache_read', color: 'var(--series-3)' },
  { key: 'cache_creation', color: 'var(--series-4)' },
] as const;

type SeriesKey = (typeof SERIES)[number]['key'];

function TokenChart({ data }: { data: UsageResponse }) {
  const buckets = useMemo(() => {
    const map = new Map<string, Record<SeriesKey, number>>();
    for (const row of data.series) {
      const cur = map.get(row.t) ?? { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
      for (const s of SERIES) cur[s.key] += Number(row[s.key] ?? 0);
      map.set(row.t, cur);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [data]);
  const max = Math.max(
    1,
    ...buckets.map(([, v]) => SERIES.reduce((sum, s) => sum + v[s.key], 0))
  );
  const width = 1000;
  const height = 180;
  const barW = buckets.length > 0 ? width / buckets.length : width;
  return (
    <svg className={styles.chart} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {buckets.map(([t, v], i) => {
        let y = height;
        return (
          <g key={t}>
            <title>{`${formatDateTime(t)}: ${SERIES.map((s) => `${s.key} ${formatTokens(v[s.key])}`).join(', ')}`}</title>
            {SERIES.map((s) => {
              const h = (v[s.key] / max) * (height - 4);
              y -= h;
              return (
                <rect
                  key={s.key}
                  x={i * barW + barW * 0.15}
                  y={y}
                  width={Math.max(1, barW * 0.7)}
                  height={h}
                  fill={s.color}
                  rx={1.5}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function UsagePage() {
  const { t } = useTranslation();
  const [range, setRange] = useState<UsageRange>('24h');
  const [group, setGroup] = useState<UsageGroupBy>('account');
  const usage = usePolling(() => sidecarApi.usage(range, group), 60_000, `${range}:${group}`);
  const sessions = usePolling(() => sidecarApi.sessions(25), 60_000);
  const requests = usePolling(() => sidecarApi.requests(50), 30_000);
  const totals = usage.data?.totals;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('usage.title')}</h1>
          <p className={styles.subtitle}>{t('usage.subtitle')}</p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.segmented} role="tablist" aria-label={t('usage.range')}>
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                role="tab"
                aria-selected={range === r}
                className={`${styles.segment} ${range === r ? styles.segmentActive : ''}`}
                onClick={() => setRange(r)}
              >
                {t(`usage.range_${r}`)}
              </button>
            ))}
          </div>
        </div>
      </header>

      {usage.error && !usage.data ? (
        <div className={styles.notice}>{t('overview.sidecar_down', { error: usage.error })}</div>
      ) : null}

      <section className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('usage.input')}</span>
          <span className={styles.statValue}>{formatTokens(totals?.input)}</span>
          <span className={styles.statHint}>
            {t('overview.requests_count', { count: totals?.requests ?? 0 })}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('usage.output')}</span>
          <span className={styles.statValue}>{formatTokens(totals?.output)}</span>
          <span className={styles.statHint}>
            {t('overview.failures_count', { count: totals?.failures ?? 0 })}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('usage.cache_read')}</span>
          <span className={styles.statValue}>{formatTokens(totals?.cache_read)}</span>
          <span className={styles.statHint}>
            {t('usage.hit_ratio', {
              value: formatPercent(totals ? totals.cache_hit_ratio * 100 : null),
            })}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>{t('usage.cache_write')}</span>
          <span className={styles.statValue}>{formatTokens(totals?.cache_creation)}</span>
          <span className={styles.statHint}>
            {t('usage.rate_limited', { count: totals?.rate_limited ?? 0 })}
          </span>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('usage.tokens_over_time')}</h2>
        </div>
        <div className={styles.table}>
          <div className={styles.chartWrap}>
            {usage.data ? <TokenChart data={usage.data} /> : <div className={styles.empty}>…</div>}
          </div>
          <div className={styles.legend}>
            {SERIES.map((s) => (
              <span key={s.key} className={styles.legendItem}>
                <span className={styles.swatch} style={{ background: s.color }} />
                {t(`usage.series_${s.key}`)}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('usage.breakdown')}</h2>
          <div className={styles.segmented} role="tablist" aria-label={t('usage.group_by')}>
            {GROUPS.map((g) => (
              <button
                key={g}
                type="button"
                role="tab"
                aria-selected={group === g}
                className={`${styles.segment} ${group === g ? styles.segmentActive : ''}`}
                onClick={() => setGroup(g)}
              >
                {t(`usage.group_${g}`)}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <span>{t(`usage.group_${group}`)}</span>
            <span>{t('usage.in_out')}</span>
            <span>{t('usage.cache')}</span>
            <span>{t('usage.requests')}</span>
            <span>{t('usage.share')}</span>
          </div>
          {(usage.data?.groups ?? []).length === 0 ? (
            <div className={styles.empty}>{t('usage.no_data')}</div>
          ) : null}
          {(usage.data?.groups ?? []).map((g) => (
            <div className={styles.row} key={g.key}>
              <span className={styles.accountName} title={g.key}>
                {group === 'account' ? maskEmail(g.label) || g.label : g.label || g.key}
              </span>
              <span className={styles.usage}>
                {formatTokens(g.input + g.output)}
                <span className={styles.usageMeta}>
                  {formatTokens(g.input)} / {formatTokens(g.output)}
                </span>
              </span>
              <span className={styles.usage}>
                {formatPercent(g.cache_hit_ratio * 100)}
                <span className={styles.usageMeta}>
                  {t('usage.read_write', {
                    read: formatTokens(g.cache_read),
                    write: formatTokens(g.cache_creation),
                  })}
                </span>
              </span>
              <span className={styles.usage}>
                {g.requests}
                <span className={styles.usageMeta}>
                  {g.failures > 0 ? t('overview.failures_count', { count: g.failures }) : ''}
                  {g.rate_limited > 0 ? ` · ${t('usage.rate_limited', { count: g.rate_limited })}` : ''}
                </span>
              </span>
              <span>{formatPercent(g.share * 100)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('usage.sessions')}</h2>
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <span>{t('usage.session')}</span>
            <span>{t('usage.in_out')}</span>
            <span>{t('usage.cache')}</span>
            <span>{t('usage.requests')}</span>
            <span>{t('usage.last')}</span>
          </div>
          {(sessions.data?.sessions ?? []).length === 0 ? (
            <div className={styles.empty}>{t('usage.no_data')}</div>
          ) : null}
          {(sessions.data?.sessions ?? []).map((s) => (
            <div className={styles.row} key={s.session_id}>
              <span className={styles.account}>
                <span className={`${styles.accountName} ${styles.mono}`}>
                  {s.session_id.slice(0, 8)}
                </span>
                <span className={styles.accountMeta}>
                  {s.models.join(', ')}
                  <span className={styles.sep}>·</span>
                  {s.accounts.map((a) => maskEmail(a) || a).join(', ')}
                </span>
              </span>
              <span className={styles.usage}>{formatTokens(s.input + s.output)}</span>
              <span className={styles.usage}>{formatPercent(s.cache_hit_ratio * 100)}</span>
              <span className={styles.usage}>{s.requests}</span>
              <span className={styles.usageMeta}>{formatRelative(s.last_at)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('usage.recent_requests')}</h2>
        </div>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <span>{t('usage.model_account')}</span>
            <span>{t('usage.in_out')}</span>
            <span>{t('usage.cache')}</span>
            <span>{t('usage.status')}</span>
            <span>{t('usage.when')}</span>
          </div>
          {(requests.data?.requests ?? []).length === 0 ? (
            <div className={styles.empty}>{t('usage.no_data')}</div>
          ) : null}
          {(requests.data?.requests ?? []).map((r, i) => (
            <div className={styles.row} key={`${r.request_id}-${i}`}>
              <span className={styles.account}>
                <span className={styles.accountName}>{r.model}</span>
                <span className={styles.accountMeta}>{maskEmail(r.account) || r.account}</span>
              </span>
              <span className={styles.usage}>
                {formatTokens(r.input_tokens)} / {formatTokens(r.output_tokens)}
              </span>
              <span className={styles.usage}>
                {t('usage.read_write', {
                  read: formatTokens(r.cache_read_tokens),
                  write: formatTokens(r.cache_creation_tokens),
                })}
              </span>
              <span className={styles.usage}>
                <span className={styles.accountMeta}>
                  <span className={`${styles.dot} ${r.failed ? styles.dot_low : styles.dot_ok}`} />
                  {r.status_code ?? '—'}
                </span>
                <span className={styles.usageMeta}>
                  {r.latency_ms ? `${(r.latency_ms / 1000).toFixed(1)}s` : ''}
                </span>
              </span>
              <span className={styles.usageMeta}>{formatRelative(r.ts)}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
