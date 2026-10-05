import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { sidecarApi, type RouterMode } from '@/services/api/sidecar';
import { useConfigStore } from '@/stores';
import { usePolling } from '@/features/overview/usePolling';
import { formatDateTime, formatRelative } from '@/features/overview/format';
import styles from '@/features/overview/Overview.module.scss';

const MODES: RouterMode[] = ['active', 'shadow', 'off'];

const pick = (source: unknown, path: string[]): unknown =>
  path.reduce<unknown>(
    (value, key) =>
      value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined,
    source
  );

const show = (value: unknown): string => {
  if (value === undefined || value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  return String(value);
};

export function RoutingPage() {
  const { t } = useTranslation();
  const router = usePolling(() => sidecarApi.router(), 30_000);
  const config = useConfigStore((s) => s.config);
  const fetchConfig = useConfigStore((s) => s.fetchConfig);
  const [saving, setSaving] = useState<RouterMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  const raw = config?.raw ?? {};
  const settings: Array<[string, unknown]> = [
    [t('routing.strategy'), pick(raw, ['routing', 'strategy']) ?? config?.routingStrategy],
    [t('routing.affinity'), pick(raw, ['routing', 'session-affinity'])],
    [t('routing.affinity_ttl'), pick(raw, ['routing', 'session-affinity-ttl'])],
    [t('routing.affinity_subagents'), pick(raw, ['routing', 'session-affinity-subagents'])],
    [t('routing.retry'), pick(raw, ['routing', 'retry', 'request-retry']) ?? config?.requestRetry],
    [t('routing.model_cooling'), pick(raw, ['upstream', 'claude', 'model-level-cooling'])],
  ];

  const setMode = async (mode: RouterMode) => {
    setSaving(mode);
    setError(null);
    try {
      await sidecarApi.setRouterMode(mode);
      await router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(null);
    }
  };

  const mode = router.data?.mode;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>{t('routing.title')}</h1>
          <p className={styles.subtitle}>{t('routing.subtitle')}</p>
        </div>
      </header>

      {router.error && !router.data ? (
        <div className={styles.notice}>{t('overview.sidecar_down', { error: router.error })}</div>
      ) : null}
      {error ? <div className={styles.notice}>{error}</div> : null}

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('routing.router_title')}</h2>
          <div className={styles.segmented} role="radiogroup" aria-label={t('routing.router_title')}>
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mode === m}
                disabled={saving !== null}
                className={`${styles.segment} ${mode === m ? styles.segmentActive : ''}`}
                onClick={() => void setMode(m)}
              >
                {t(`routing.mode_${m}`)}
              </button>
            ))}
          </div>
        </div>
        <p className={styles.footnote}>
          {t(`routing.mode_${mode ?? 'off'}_help`)}{' '}
          {router.data?.last_run
            ? t('routing.last_run', { when: formatRelative(router.data.last_run) })
            : ''}
        </p>
        <div className={styles.table}>
          <div className={`${styles.row} ${styles.rowHead}`}>
            <span>{t('overview.col_account')}</span>
            <span>{t('routing.weekly_reset')}</span>
            <span>{t('routing.reason')}</span>
            <span>{t('routing.current')}</span>
            <span>{t('routing.target')}</span>
          </div>
          {(router.data?.ranking ?? []).length === 0 ? (
            <div className={styles.empty}>{t('overview.no_accounts')}</div>
          ) : null}
          {(router.data?.ranking ?? []).map((r, i) => (
            <div className={styles.row} key={r.auth_index}>
              <span className={styles.account}>
                <span className={styles.accountName}>{r.name.replace(/^[a-z]+-/, '').replace(/\.json$/, '')}</span>
                <span className={styles.accountMeta}>
                  <span className={`${styles.dot} ${r.eligible ? styles.dot_ok : styles.dot_low}`} />
                  {r.eligible ? t('routing.rank', { rank: i + 1 }) : t('routing.skipped')}
                </span>
              </span>
              <span className={styles.usage}>
                {formatRelative(r.seven_day_resets_at)}
                <span className={styles.usageMeta}>{formatDateTime(r.seven_day_resets_at)}</span>
              </span>
              <span className={styles.usageMeta}>{r.reason}</span>
              <span>{r.priority}</span>
              <span>{r.recommended_priority}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHead}>
          <h2 className={styles.sectionTitle}>{t('routing.proxy_title')}</h2>
          <div className={styles.sectionLinks}>
            <Link to="/config">{t('routing.edit_config')}</Link>
          </div>
        </div>
        <div className={styles.table}>
          {settings.map(([label, value]) => (
            <div className={styles.kv} key={label}>
              <span className={styles.kvLabel}>{label}</span>
              <span>{show(value)}</span>
              <span />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
