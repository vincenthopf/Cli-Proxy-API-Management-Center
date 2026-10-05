import { useMemo, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { IconChevronDown, IconChevronUp, IconSlidersHorizontal } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { SelectionCheckbox } from '@/components/ui/SelectionCheckbox';
import type { ProviderSortBy, SortDir } from '../types';

interface ProviderResourceToolbarProps {
  sortBy: ProviderSortBy;
  sortDir: SortDir;
  onSortBy: (value: ProviderSortBy) => void;
  onSortDir: (value: SortDir) => void;
  availableModels: ReadonlyArray<string>;
  selectedModels: ReadonlySet<string>;
  onSelectedModelsChange: (next: Set<string>) => void;
}

export function ProviderResourceToolbar({
  sortBy,
  sortDir,
  onSortBy,
  onSortDir,
  availableModels,
  selectedModels,
  onSelectedModelsChange,
}: ProviderResourceToolbarProps) {
  const { t } = useTranslation();
  const [filterOpen, setFilterOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const sortOptions = useMemo(
    () => [
      { value: 'name', label: t('providersPage.toolbar.sort.name') },
      { value: 'priority', label: t('providersPage.toolbar.sort.priority') },
      {
        value: 'recent-success',
        label: t('providersPage.toolbar.sort.recentSuccess'),
      },
    ],
    [t]
  );

  useEffect(() => {
    if (!filterOpen) return;
    const onClickOutside = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFilterOpen(false);
      }
    };
    document.addEventListener('pointerdown', onClickOutside);
    return () => document.removeEventListener('pointerdown', onClickOutside);
  }, [filterOpen]);

  const toggleModel = (name: string) => {
    const next = new Set(selectedModels);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    onSelectedModelsChange(next);
  };

  const selectAll = () => onSelectedModelsChange(new Set(availableModels));
  const clearAll = () => onSelectedModelsChange(new Set());

  const filterLabel =
    selectedModels.size === 0
      ? t('providersPage.toolbar.filter.allModels')
      : t('providersPage.toolbar.filter.selectedModels', {
          selected: selectedModels.size,
          total: availableModels.length,
        });

  const directionLabel =
    sortDir === 'asc'
      ? t('providersPage.toolbar.sort.directionAsc')
      : t('providersPage.toolbar.sort.directionDesc');

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <span className="text-xs whitespace-nowrap text-kumo-subtle">
          {t('providersPage.toolbar.sortBy')}
        </span>
        <Select
          value={sortBy}
          options={sortOptions}
          onChange={(value) => onSortBy(value as ProviderSortBy)}
          ariaLabel={t('providersPage.toolbar.sortBy')}
          size="sm"
          fullWidth={false}
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => onSortDir(sortDir === 'asc' ? 'desc' : 'asc')}
          aria-label={directionLabel}
          title={directionLabel}
        >
          {sortDir === 'asc' ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
        </Button>
      </div>

      <div className="relative" ref={containerRef}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setFilterOpen((v) => !v)}
          disabled={availableModels.length === 0}
          aria-expanded={filterOpen}
        >
          <IconSlidersHorizontal size={14} />
          <span>{filterLabel}</span>
          <IconChevronDown size={12} />
        </Button>
        {filterOpen ? (
          <div className="absolute top-[calc(100%+6px)] right-0 z-10 flex max-w-80 min-w-56 flex-col gap-1.5 rounded-lg bg-kumo-base p-2 shadow-lg ring ring-kumo-line">
            <div className="flex items-center justify-end gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAll}
                disabled={availableModels.length === 0}
              >
                {t('providersPage.toolbar.filter.selectAll')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                disabled={selectedModels.size === 0}
              >
                {t('providersPage.toolbar.filter.clear')}
              </Button>
            </div>
            {availableModels.length === 0 ? (
              <div className="p-3 text-center text-sm text-kumo-subtle">
                {t('providersPage.toolbar.filter.empty')}
              </div>
            ) : (
              <ul className="m-0 flex max-h-56 list-none flex-col gap-0.5 overflow-y-auto p-0">
                {availableModels.map((name) => (
                  <li key={name} className="rounded-md px-1.5 py-1 hover:bg-kumo-tint">
                    <SelectionCheckbox
                      checked={selectedModels.has(name)}
                      onChange={() => toggleModel(name)}
                      label={<span className="font-mono text-sm break-all">{name}</span>}
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
