import { useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { LayerCard } from '@cloudflare/kumo';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { IconRefreshCw } from '@/components/ui/icons';
import type { ResolvedTheme } from '@/types';
import { resolveQuotaErrorMessage } from '@/utils/quota';
import { getQuotaDisplayName } from '@/utils/quota/identity';
import {
  getAuthFileIcon,
  getThemeSurfaceIconBackground,
  getTypeLabel,
  isThemeSurfaceIconProvider,
} from '@/features/authFiles/constants';
import { bindQuotaClasses } from '../types';
import { QUOTA_ADAPTERS, type QuotaCardState } from '../providers';
import { isQuotaRefreshDisabled, type QuotaFileEntry } from '../logic';
import { useClaudeResetGrants } from '../providers/claude/ClaudeResetGrants';
import bodyStyles from './QuotaBody.module.scss';
import styles from './QuotaCard.module.scss';

const quotaClasses = bindQuotaClasses(bodyStyles, 'QuotaBody.module.scss');

const SPIN_CLASS = 'animate-spin motion-reduce:animate-none';

export type QuotaCardProps = {
  entry: QuotaFileEntry;
  quota?: QuotaCardState;
  resolvedTheme: ResolvedTheme;
  canRefresh: boolean;
  resetting: boolean;
  entranceDelayMs?: number | null;
  onRefresh: () => void;
  onReset: () => void;
};

export function QuotaCard(props: QuotaCardProps) {
  const {
    entry,
    quota,
    resolvedTheme,
    canRefresh,
    resetting,
    entranceDelayMs,
    onRefresh,
    onReset,
  } = props;
  const { t } = useTranslation();
  const adapter = QUOTA_ADAPTERS[entry.type];
  const file = entry.file;
  const displayName = getQuotaDisplayName(file);

  const [mountEntranceDelayMs] = useState<number | null>(entranceDelayMs ?? null);
  const entranceStyle =
    mountEntranceDelayMs === null
      ? undefined
      : ({ '--card-delay': `${mountEntranceDelayMs}ms` } as CSSProperties);

  const status = quota?.status ?? 'idle';
  const loading = status === 'loading';
  const claudeReset = useClaudeResetGrants(
    file,
    entry.type === 'claude' && status !== 'idle',
    !canRefresh || loading || resetting,
    quota,
    onRefresh
  );
  const iconSrc = getAuthFileIcon(entry.type, resolvedTheme);
  const typeLabel = getTypeLabel(t, entry.type);
  const errorMessage = resolveQuotaErrorMessage(
    t,
    quota?.errorStatus,
    quota?.error || t('common.unknown_error')
  );
  const showReset =
    status === 'success' &&
    Boolean(adapter.resetQuota) &&
    quota !== undefined &&
    Boolean(adapter.canResetQuota?.(quota));

  return (
    <LayerCard
      render={<article />}
      className={[
        'flex flex-col gap-3 !overflow-visible p-4',
        mountEntranceDelayMs === null ? '' : styles.cardEnter,
      ]
        .filter(Boolean)
        .join(' ')}
      style={entranceStyle}
    >
      <header className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex size-7 shrink-0 items-center justify-center rounded-md bg-kumo-recessed ring ring-kumo-hairline"
          title={typeLabel}
          style={
            isThemeSurfaceIconProvider(entry.type)
              ? { background: getThemeSurfaceIconBackground(resolvedTheme) }
              : undefined
          }
        >
          {iconSrc ? (
            <img src={iconSrc} alt="" className="block size-4 object-contain" />
          ) : (
            <span className="text-xs font-semibold text-kumo-subtle">
              {typeLabel.slice(0, 1).toUpperCase()}
            </span>
          )}
        </span>
        <span
          className="min-w-0 truncate font-mono text-sm font-medium text-kumo-default"
          title={displayName}
        >
          {displayName}
        </span>
      </header>

      <div className="flex min-w-0 flex-col gap-2.5">
        {entry.type === 'claude' && status === 'success' && (
          <>
            <div className={quotaClasses.codexPlan}>
              <span className={quotaClasses.codexPlanItem}>
                <span className={quotaClasses.codexPlanLabel}>{t('claude_reset.remaining')}</span>
                <span className={quotaClasses.codexPlanValue}>{claudeReset.count ?? '--'}</span>
              </span>
            </div>
            {claudeReset.message && (
              <div role="status" className={quotaClasses.codexResetCreditsError}>
                {t(`claude_reset.${claudeReset.message}`)}
              </div>
            )}
          </>
        )}
        {status === 'idle' ? (
          <button
            type="button"
            className="flex min-h-19 w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-kumo-line bg-transparent px-3 py-3 text-kumo-subtle transition-colors hover:border-solid hover:bg-kumo-tint hover:text-kumo-default focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onRefresh}
            disabled={!canRefresh}
          >
            <IconRefreshCw size={15} aria-hidden="true" className="shrink-0" />
            <span className="text-center text-sm">{t(`${adapter.i18nPrefix}.idle`)}</span>
          </button>
        ) : loading ? (
          <div className="flex flex-col gap-3 pt-1" aria-busy="true">
            <span className="sr-only">{t(`${adapter.i18nPrefix}.loading`)}</span>
            {[0, 1].map((row) => (
              <div key={row} className="flex flex-col gap-1.5" aria-hidden="true">
                <Skeleton width="40%" height={10} rounded={9999} />
                <Skeleton width="100%" height={8} rounded={9999} />
              </div>
            ))}
          </div>
        ) : status === 'error' ? (
          <div
            className="rounded-lg bg-kumo-danger-tint px-3 py-2 text-sm text-kumo-danger ring ring-kumo-danger/30 [overflow-wrap:anywhere]"
            role="alert"
          >
            {t(`${adapter.i18nPrefix}.load_failed`, { message: errorMessage })}
          </div>
        ) : quota ? (
          <adapter.Body quota={quota} classes={quotaClasses} />
        ) : (
          <div className="text-center text-sm text-kumo-subtle">
            {t(`${adapter.i18nPrefix}.idle`)}
          </div>
        )}
      </div>

      {status !== 'idle' && (
        <footer className="mt-auto flex flex-wrap justify-end gap-2 border-t border-kumo-hairline pt-3">
          {entry.type === 'claude' && (
            <Button
              variant="secondary"
              size="sm"
              disabled={claudeReset.blocked}
              onClick={claudeReset.confirm}
              title={t(`claude_reset.${claudeReset.buttonLabel}`)}
            >
              <IconRefreshCw size={13} className={claudeReset.busy ? SPIN_CLASS : undefined} />
              {t(`claude_reset.${claudeReset.buttonLabel}`)}
            </Button>
          )}
          {showReset && (
            <Button
              variant="secondary"
              size="sm"
              onClick={onReset}
              disabled={!canRefresh || loading || resetting}
              title={t('codex_quota.reset_button')}
            >
              <IconRefreshCw size={13} className={resetting ? SPIN_CLASS : undefined} />
              {t('codex_quota.reset_button')}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isQuotaRefreshDisabled(canRefresh, loading, resetting || claudeReset.busy)}
            title={t('auth_files.quota_refresh_hint')}
          >
            <IconRefreshCw size={13} className={loading ? SPIN_CLASS : undefined} />
            {t('auth_files.quota_refresh_single')}
          </Button>
        </footer>
      )}
    </LayerCard>
  );
}
