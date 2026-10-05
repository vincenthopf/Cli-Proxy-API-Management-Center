import { useTranslation } from 'react-i18next';
import { Badge } from '@cloudflare/kumo';
import { Button } from '@/components/ui/Button';
import { IconLoader2, IconPlus, IconRefreshCw } from '@/components/ui/icons';

interface ProviderHeaderCardProps {
  title?: string;
  totalActive: number;
  totalResources: number;
  providerFamilies: number;
  updatedAtLabel: string;
  isFetching?: boolean;
  isNewDisabled?: boolean;
  showNewAction?: boolean;
  showSummary?: boolean;
  newLabel?: string;
  variant?: 'quickStart';
  onRefresh: () => void;
  onNew: () => void;
}

export function ProviderHeaderCard({
  title,
  totalActive,
  totalResources,
  providerFamilies,
  updatedAtLabel,
  isFetching = false,
  isNewDisabled = false,
  showNewAction = true,
  showSummary = true,
  newLabel,
  variant,
  onRefresh,
  onNew,
}: ProviderHeaderCardProps) {
  const { t } = useTranslation();
  const quickStart = variant === 'quickStart';
  const refreshLabel = isFetching
    ? t('providersPage.actions.syncing')
    : t('providersPage.actions.refresh');

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1
          className={[
            'm-0 min-w-0 font-semibold text-kumo-default',
            quickStart ? 'text-3xl leading-tight' : 'text-xl leading-tight',
          ].join(' ')}
        >
          {title ?? t('providersPage.header.title')}
        </h1>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <Button variant="secondary" onClick={onRefresh} disabled={isFetching}>
            {isFetching ? (
              <IconLoader2 size={16} className="animate-spin motion-reduce:animate-none" />
            ) : (
              <IconRefreshCw size={16} />
            )}
            <span>{refreshLabel}</span>
          </Button>
          {showNewAction ? (
            <Button variant="primary" onClick={onNew} disabled={isNewDisabled}>
              <IconPlus size={16} />
              <span>{newLabel ?? t('providersPage.actions.new')}</span>
            </Button>
          ) : null}
        </div>
      </div>

      {showSummary ? (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">
            {t('providersPage.header.activeResources', {
              active: totalActive,
              total: totalResources,
            })}
          </Badge>
          <Badge variant="secondary">
            {t('providersPage.header.providerFamilies', { count: providerFamilies })}
          </Badge>
          <Badge variant="secondary">
            {t('providersPage.header.updatedAt', { time: updatedAtLabel })}
          </Badge>
        </div>
      ) : null}
    </section>
  );
}
