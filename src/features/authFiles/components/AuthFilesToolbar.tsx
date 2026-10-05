import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Input as KumoInput, InputGroup, Popover, Tabs } from '@cloudflare/kumo';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { IconSearch, IconSlidersHorizontal, IconTrash2 } from '@/components/ui/icons';
import { MAX_CARD_PAGE_SIZE, MIN_CARD_PAGE_SIZE } from '@/features/authFiles/constants';
import type { AuthFilesSortMode, AuthFilesStatusFilterMode } from '@/features/authFiles/uiState';

export type AuthFilesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilterMode: AuthFilesStatusFilterMode;
  statusFilterOptions: Array<{ value: AuthFilesStatusFilterMode; label: string }>;
  onStatusFilterChange: (mode: AuthFilesStatusFilterMode) => void;
  sortMode: AuthFilesSortMode;
  sortOptions: Array<{ value: string; label: string }>;
  onSortModeChange: (value: string) => void;
  pageSizeInput: string;
  onPageSizeInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onPageSizeCommit: (rawValue: string) => void;
  compactMode: boolean;
  onCompactModeChange: (value: boolean) => void;
  deleteLabel: string;
  deleteDisabled: boolean;
  deleteLoading: boolean;
  onDelete: () => void;
};

export function AuthFilesToolbar(props: AuthFilesToolbarProps) {
  const {
    search,
    onSearchChange,
    statusFilterMode,
    statusFilterOptions,
    onStatusFilterChange,
    sortMode,
    sortOptions,
    onSortModeChange,
    pageSizeInput,
    onPageSizeInputChange,
    onPageSizeCommit,
    compactMode,
    onCompactModeChange,
    deleteLabel,
    deleteDisabled,
    deleteLoading,
    onDelete,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
      <InputGroup className="max-w-[340px] min-w-[180px] flex-[1_1_220px] max-[900px]:max-w-none max-[900px]:basis-full">
        <InputGroup.Addon>
          <IconSearch size={15} className="text-kumo-subtle" />
        </InputGroup.Addon>
        <InputGroup.Input
          value={search}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onSearchChange(e.target.value)}
          placeholder={t('auth_files.search_placeholder')}
          aria-label={t('auth_files.search_label')}
        />
      </InputGroup>

      <div role="group" aria-label={t('auth_files.problem_filter_label')} className="max-w-full">
        <Tabs
          variant="segmented"
          value={statusFilterMode}
          onValueChange={(value) => onStatusFilterChange(value as AuthFilesStatusFilterMode)}
          tabs={statusFilterOptions.map((option) => ({
            value: option.value,
            label: option.label,
            className: option.value === 'problem' ? 'aria-selected:!text-kumo-danger' : undefined,
          }))}
        />
      </div>

      <div className="min-w-36">
        <Select
          value={sortMode}
          options={sortOptions}
          onChange={onSortModeChange}
          ariaLabel={t('auth_files.sort_label')}
        />
      </div>

      <Popover>
        <Popover.Trigger
          render={
            <Button variant="secondary" title={t('auth_files.display_options_label')}>
              <IconSlidersHorizontal size={15} />
              {t('auth_files.display_options_label')}
            </Button>
          }
        />
        <Popover.Content align="end" className="min-w-56">
          <div id="auth-files-display-settings" className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3 text-sm text-kumo-subtle">
              <label htmlFor="auth-files-page-size">{t('auth_files.page_size_label')}</label>
              <KumoInput
                id="auth-files-page-size"
                size="sm"
                className="w-16 text-right font-mono tabular-nums"
                type="number"
                min={MIN_CARD_PAGE_SIZE}
                max={MAX_CARD_PAGE_SIZE}
                step={1}
                value={pageSizeInput}
                onChange={onPageSizeInputChange}
                onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
                  onPageSizeCommit(e.currentTarget.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    e.currentTarget.blur();
                  }
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 text-sm text-kumo-subtle">
              <span>{t('auth_files.compact_mode_label')}</span>
              <ToggleSwitch
                checked={compactMode}
                onChange={onCompactModeChange}
                ariaLabel={t('auth_files.compact_mode_label')}
              />
            </div>
          </div>
        </Popover.Content>
      </Popover>

      <Button
        variant="ghost"
        className="ml-auto !text-kumo-danger max-[900px]:ml-0"
        onClick={onDelete}
        disabled={deleteDisabled}
        loading={deleteLoading}
      >
        {deleteLoading ? null : <IconTrash2 size={14} />}
        {deleteLabel}
      </Button>
    </div>
  );
}
