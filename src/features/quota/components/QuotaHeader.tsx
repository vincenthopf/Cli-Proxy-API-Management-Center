import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { IconRefreshCw } from '@/components/ui/icons';
import { useCountUp } from '@/hooks/motion';

export type QuotaHeaderProps = {
  totalCount: number;
  loadedCount: number;
  attentionCount: number;
  refreshing: boolean;
  disableControls: boolean;
  onRefreshAll: () => void;
};

export function QuotaHeader(props: QuotaHeaderProps) {
  const { totalCount, loadedCount, attentionCount, refreshing, disableControls, onRefreshAll } =
    props;
  const { t } = useTranslation();
  const displayLoadedCount = useCountUp(loadedCount);

  return (
    <header className="flex flex-col items-stretch justify-between gap-x-6 gap-y-4 sm:flex-row sm:flex-wrap sm:items-end">
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="m-0 text-xl font-semibold text-kumo-default" data-reveal>
          {t('quota_management.title')}
        </h1>
        <p
          className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-kumo-subtle tabular-nums"
          data-reveal
        >
          <span>{t('quota_management.meta_credentials', { count: totalCount })}</span>
          <span className="text-kumo-inactive select-none" aria-hidden="true">
            ·
          </span>
          <span className={loadedCount > 0 ? 'text-kumo-success' : undefined}>
            {t('quota_management.meta_loaded', { count: displayLoadedCount })}
          </span>
          {attentionCount > 0 && (
            <>
              <span className="text-kumo-inactive select-none" aria-hidden="true">
                ·
              </span>
              <span className="text-kumo-danger">
                {t('quota_management.meta_attention', { count: attentionCount })}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2" data-reveal>
        <Button variant="primary" onClick={onRefreshAll} disabled={disableControls || refreshing}>
          <IconRefreshCw
            size={14}
            className={refreshing ? 'animate-spin motion-reduce:animate-none' : undefined}
          />
          {t('quota_management.refresh_all_credentials')}
        </Button>
      </div>
    </header>
  );
}
