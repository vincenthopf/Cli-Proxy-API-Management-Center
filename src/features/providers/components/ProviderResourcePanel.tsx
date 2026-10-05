import { useTranslation } from 'react-i18next';
import { Empty, InputGroup, LayerCard, LinkButton } from '@cloudflare/kumo';
import { Button } from '@/components/ui/Button';
import { IconExternalLink, IconPlus, IconSearch } from '@/components/ui/icons';
import type { ProviderRecentUsageMap } from '@/components/providers/utils';
import { PROVIDER_LOGOS } from '../brandLogos';
import { getKimiAffiliateUrl } from '../kimi';
import { APIKEY_FUN_AFFILIATE_URL, APIKEY_FUN_DASHBOARD_URL } from '../sponsor';
import { getSponsorProviderDefinition } from '../sponsorDefinitions';
import type { ProviderGroup, ProviderResource } from '../types';
import { ProviderResourceTable } from './ProviderResourceTable';
import { ProviderResourceToolbar } from './ProviderResourceToolbar';
import { ProviderBrandLogo } from './ProviderBrandLogo';
import type { ProviderSortBy, SortDir } from '../types';

export interface ProviderPanelControls {
  sortBy: ProviderSortBy;
  sortDir: SortDir;
  onSortBy: (value: ProviderSortBy) => void;
  onSortDir: (value: SortDir) => void;
  availableModels: ReadonlyArray<string>;
  selectedModels: ReadonlySet<string>;
  onSelectedModelsChange: (next: Set<string>) => void;
}

interface ProviderResourcePanelProps {
  group: ProviderGroup;
  filter: string;
  onFilterChange: (value: string) => void;
  filteredResources: ProviderResource[];
  selectedId: string | null;
  disableMutations?: boolean;
  usageByProvider?: ProviderRecentUsageMap;
  toolbarControls?: ProviderPanelControls;
  onView: (resource: ProviderResource) => void;
  onEdit: (resource: ProviderResource) => void;
  onDelete: (resource: ProviderResource) => void;
  onToggleDisabled?: (resource: ProviderResource, disabled: boolean) => void;
  onCreate: () => void;
}

export function ProviderResourcePanel({
  group,
  filter,
  onFilterChange,
  filteredResources,
  selectedId,
  disableMutations,
  usageByProvider,
  toolbarControls,
  onView,
  onEdit,
  onDelete,
  onToggleDisabled,
  onCreate,
}: ProviderResourcePanelProps) {
  const { t, i18n } = useTranslation();
  const logo = PROVIDER_LOGOS[group.id];
  const providerTitle = t(`providersPage.providerNames.${group.id}`);
  const hasProviderInfo = group.resources.length > 0;
  const showSponsorRegistrationLink = group.id === 'apikeyFun' && !hasProviderInfo;
  const showSponsorDashboardLink = group.id === 'apikeyFun' && hasProviderInfo;
  const registrationUrl =
    group.id === 'kimi'
      ? getKimiAffiliateUrl(i18n.resolvedLanguage ?? i18n.language)
      : group.id === 'fennoAI' || group.id === 'qiniuCloud'
        ? getSponsorProviderDefinition(group.id).affiliateUrl
        : null;
  const registrationLabel = t(
    group.id === 'kimi' ? 'providersPage.sponsor.registerNow' : 'providersPage.sponsor.registerLink'
  );
  const emptyText = showSponsorRegistrationLink
    ? t('providersPage.sponsor.emptyRegisterHint')
    : t('providersPage.table.empty');
  const titleContent = (
    <>
      <ProviderBrandLogo logo={logo} />
      <h2 className="m-0 text-xl font-semibold text-kumo-default">{providerTitle}</h2>
      {showSponsorDashboardLink ? (
        <IconExternalLink
          className="shrink-0 text-kumo-subtle transition-transform group-hover:translate-x-px group-hover:-translate-y-px"
          size={16}
        />
      ) : null}
    </>
  );

  return (
    <LayerCard className="flex min-w-0 flex-col gap-4 !overflow-visible p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 flex-col items-start gap-2">
            {showSponsorDashboardLink ? (
              <a
                className="group -mx-1.5 -my-1 flex w-fit max-w-full items-center gap-3 rounded-lg px-1.5 py-1 text-inherit no-underline focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none"
                href={APIKEY_FUN_DASHBOARD_URL}
                target="_blank"
                rel="noreferrer"
                title={t('providersPage.sponsor.dashboardLink')}
              >
                {titleContent}
              </a>
            ) : (
              <div className="flex items-center gap-3">{titleContent}</div>
            )}
            {showSponsorDashboardLink ? (
              <LinkButton
                href={APIKEY_FUN_DASHBOARD_URL}
                external
                variant="secondary"
                size="sm"
                icon={<IconExternalLink size={14} />}
              >
                {t('providersPage.sponsor.dashboardLink')}
              </LinkButton>
            ) : registrationUrl ? (
              <>
                <LinkButton
                  href={registrationUrl}
                  external
                  variant="primary"
                  size="sm"
                  icon={<IconExternalLink size={14} />}
                >
                  {registrationLabel}
                </LinkButton>
                {group.id === 'kimi' ? (
                  <p className="m-0 text-sm text-kumo-subtle">
                    {t('providersPage.sponsor.kimiPromo')}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="w-full min-w-0 md:w-72">
            <InputGroup>
              <InputGroup.Addon>
                <IconSearch size={16} />
              </InputGroup.Addon>
              <InputGroup.Input
                type="search"
                value={filter}
                onChange={(event) => onFilterChange(event.target.value)}
                placeholder={t('providersPage.table.filterPlaceholder')}
                aria-label={t('providersPage.table.filterPlaceholder')}
              />
            </InputGroup>
          </div>
        </div>
        {toolbarControls ? (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <ProviderResourceToolbar
              key={group.id}
              sortBy={toolbarControls.sortBy}
              sortDir={toolbarControls.sortDir}
              onSortBy={toolbarControls.onSortBy}
              onSortDir={toolbarControls.onSortDir}
              availableModels={toolbarControls.availableModels}
              selectedModels={toolbarControls.selectedModels}
              onSelectedModelsChange={toolbarControls.onSelectedModelsChange}
            />
          </div>
        ) : null}
      </div>

      {filteredResources.length === 0 ? (
        <Empty
          size="sm"
          title={emptyText}
          contents={
            showSponsorRegistrationLink ? (
              <LinkButton
                href={APIKEY_FUN_AFFILIATE_URL}
                external
                variant="primary"
                icon={<IconExternalLink size={16} />}
              >
                {t('providersPage.sponsor.registerLink')}
              </LinkButton>
            ) : (
              <Button variant="secondary" onClick={onCreate}>
                <IconPlus size={16} />
                <span>{t('providersPage.actions.new')}</span>
              </Button>
            )
          }
        />
      ) : (
        <ProviderResourceTable
          resources={filteredResources}
          selectedId={selectedId}
          disableMutations={disableMutations}
          usageByProvider={usageByProvider}
          onView={onView}
          onEdit={onEdit}
          onDelete={onDelete}
          onToggleDisabled={onToggleDisabled}
        />
      )}
    </LayerCard>
  );
}
