import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { IconRefreshCw, IconUpload } from '@/components/ui/icons';
import { useRevealGroup } from '@/hooks/motion';

export type VaultHeaderProps = {
  totalCount: number;
  activeCount: number;
  problemCount: number;
  loading: boolean;
  refreshing: boolean;
  uploading: boolean;
  disableControls: boolean;
  onUpload: () => void;
  onRefresh: () => void;
  refreshingCredentials?: boolean;
  credentialRefreshDisabled?: boolean;
  onRefreshCredentials?: () => void;
};

export function VaultHeader(props: VaultHeaderProps) {
  const {
    totalCount,
    activeCount,
    problemCount,
    loading,
    refreshing,
    uploading,
    disableControls,
    onUpload,
    onRefresh,
    refreshingCredentials = false,
    credentialRefreshDisabled = false,
    onRefreshCredentials,
  } = props;
  const { t } = useTranslation();
  const revealRef = useRevealGroup<HTMLElement>();

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4" ref={revealRef}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <h1 className="m-0 text-xl font-semibold text-kumo-default" data-reveal>
          {t('auth_files.title')}
        </h1>
        <p
          className="m-0 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm text-kumo-subtle tabular-nums"
          data-reveal
        >
          <span>{t('auth_files.meta_total', { count: totalCount })}</span>
          <span className="text-kumo-inactive select-none" aria-hidden="true">
            ·
          </span>
          <span className={activeCount > 0 ? 'text-kumo-success' : undefined}>
            {t('auth_files.meta_active', { count: activeCount })}
          </span>
          {problemCount > 0 && (
            <>
              <span className="text-kumo-inactive select-none" aria-hidden="true">
                ·
              </span>
              <span className="text-kumo-danger">
                {t('auth_files.meta_problem', { count: problemCount })}
              </span>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2" data-reveal>
        {onRefreshCredentials && (
          <Button
            variant="secondary"
            onClick={onRefreshCredentials}
            loading={refreshingCredentials}
            disabled={disableControls || loading || credentialRefreshDisabled}
          >
            {refreshingCredentials ? null : <IconRefreshCw size={14} />}
            {t('auth_files.refresh_all_button')}
          </Button>
        )}
        <Button variant="secondary" onClick={onRefresh} disabled={loading || refreshing}>
          <IconRefreshCw size={14} className={refreshing ? 'animate-spin motion-reduce:animate-none' : undefined} />
          {t('common.refresh')}
        </Button>
        <Button onClick={onUpload} loading={uploading} disabled={disableControls}>
          {uploading ? null : <IconUpload size={15} />}
          {t('auth_files.upload_button')}
        </Button>
      </div>
    </header>
  );
}
