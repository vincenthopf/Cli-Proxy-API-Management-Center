import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, DropdownMenu, InputGroup } from '@cloudflare/kumo';
import {
  ArrowsClockwiseIcon,
  DotsThreeIcon,
  MagnifyingGlassIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { Select, type SelectOption } from '@/components/ui/Select';
import type { AuthFilesSortMode, AuthFilesStatusFilterMode } from '@/features/authFiles/uiState';

export type AuthFilesToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilterMode: AuthFilesStatusFilterMode;
  statusFilterOptions: SelectOption[];
  onStatusFilterChange: (mode: AuthFilesStatusFilterMode) => void;
  providerFilter: string;
  providerOptions: SelectOption[];
  onProviderFilterChange: (value: string) => void;
  sortMode: AuthFilesSortMode;
  sortOptions: SelectOption[];
  onSortModeChange: (value: string) => void;
  refreshTokensDisabled: boolean;
  onRefreshTokens: () => void;
  deleteLabel: string;
  deleteDisabled: boolean;
  onDelete: () => void;
};

export function AuthFilesToolbar(props: AuthFilesToolbarProps) {
  const {
    search,
    onSearchChange,
    statusFilterMode,
    statusFilterOptions,
    onStatusFilterChange,
    providerFilter,
    providerOptions,
    onProviderFilterChange,
    sortMode,
    sortOptions,
    onSortModeChange,
    refreshTokensDisabled,
    onRefreshTokens,
    deleteLabel,
    deleteDisabled,
    onDelete,
  } = props;
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <InputGroup className="min-w-48 flex-[1_1_240px] sm:max-w-80">
        <InputGroup.Addon>
          <MagnifyingGlassIcon size={15} className="text-kumo-subtle" />
        </InputGroup.Addon>
        <InputGroup.Input
          value={search}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onSearchChange(event.target.value)}
          placeholder={t('auth_files.search_placeholder')}
          aria-label={t('auth_files.search_label')}
        />
      </InputGroup>
      <Select
        value={statusFilterMode}
        options={statusFilterOptions}
        onChange={(value) => onStatusFilterChange(value as AuthFilesStatusFilterMode)}
        ariaLabel={t('auth_files.problem_filter_label')}
        fullWidth={false}
      />
      <Select
        value={providerFilter}
        options={providerOptions}
        onChange={onProviderFilterChange}
        ariaLabel={t('accounts.provider_filter_label')}
        fullWidth={false}
      />
      <Select
        value={sortMode}
        options={sortOptions}
        onChange={onSortModeChange}
        ariaLabel={t('auth_files.sort_label')}
        fullWidth={false}
      />
      <DropdownMenu>
        <DropdownMenu.Trigger
          render={
            <Button
              variant="secondary"
              shape="square"
              className="ml-auto"
              aria-label={t('accounts.more_actions')}
            >
              <DotsThreeIcon size={18} weight="bold" />
            </Button>
          }
        />
        <DropdownMenu.Content>
          <DropdownMenu.Item
            icon={ArrowsClockwiseIcon}
            disabled={refreshTokensDisabled}
            onClick={onRefreshTokens}
          >
            {t('auth_files.refresh_all_button')}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            icon={TrashIcon}
            variant="danger"
            disabled={deleteDisabled}
            onClick={onDelete}
          >
            {deleteLabel}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>
    </div>
  );
}
