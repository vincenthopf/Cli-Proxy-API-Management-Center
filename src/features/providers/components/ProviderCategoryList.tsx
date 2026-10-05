import { useTranslation } from 'react-i18next';
import { Badge, LayerCard } from '@cloudflare/kumo';
import { PROVIDER_LOGOS } from '../brandLogos';
import type { ProviderBrand, ProviderGroup } from '../types';
import { ProviderBrandLogo } from './ProviderBrandLogo';

interface ProviderCategoryListProps {
  groups: ProviderGroup[];
  activeBrand: ProviderBrand;
  onSelect: (brand: ProviderBrand) => void;
}

const SPONSOR_BRANDS: ReadonlySet<ProviderBrand> = new Set<ProviderBrand>([
  'fennoAI',
  'qiniuCloud',
  'apikeyFun',
]);

export function ProviderCategoryList({ groups, activeBrand, onSelect }: ProviderCategoryListProps) {
  const { t } = useTranslation();

  const providerGroups = groups
    .filter((g) => !SPONSOR_BRANDS.has(g.id) || g.resources.length > 0)
    .sort((left, right) => Number(right.resources.length > 0) - Number(left.resources.length > 0));

  return (
    <LayerCard className="min-w-0 self-start p-2">
      <p className="mx-2 mt-1 mb-2 text-xs font-medium tracking-wide text-kumo-subtle uppercase">
        {t('providersPage.categories.title')}
      </p>
      <div className="flex flex-col gap-0.5">
        {providerGroups.map((group) => {
          const active = group.id === activeBrand;
          const total = group.resources.length;
          const activeCount = group.resources.filter((r) => !r.disabled).length;

          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onSelect(group.id)}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition-colors',
                'focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none',
                active
                  ? 'bg-kumo-tint text-kumo-strong'
                  : 'text-kumo-default hover:bg-kumo-tint/60',
              ].join(' ')}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2.5">
                <ProviderBrandLogo logo={PROVIDER_LOGOS[group.id]} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-medium">
                    {t(`providersPage.providerNames.${group.id}`)}
                  </span>
                  <span className="text-xs text-kumo-subtle">
                    {t('providersPage.categories.activeCount', {
                      active: activeCount,
                      total,
                    })}
                  </span>
                </span>
              </span>
              <Badge variant={total === 0 ? 'outline' : active ? 'info' : 'secondary'}>
                {total}
              </Badge>
            </button>
          );
        })}
      </div>
    </LayerCard>
  );
}
