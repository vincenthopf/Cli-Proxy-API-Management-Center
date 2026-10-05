import { Suspense, lazy, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner, Button, Input, Loader, Text } from '@cloudflare/kumo';
import {
  CaretDownIcon,
  CaretUpIcon,
  EyeIcon,
  EyeSlashIcon,
  MagnifyingGlassIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useSourceSearch } from '@/features/config/hooks/useSourceSearch';
import { redactYamlText } from '@/utils/redactSecrets';

const LazyConfigSourceEditor = lazy(
  () => import('@/features/config/components/ConfigSourceEditor')
);

export type YamlSectionProps = {
  value: string;
  editable: boolean;
  sourceDirty: boolean;
  parseError: string | null;
  theme: 'light' | 'dark';
  onChange: (value: string) => void;
};

export function YamlSection({
  value,
  editable,
  sourceDirty,
  parseError,
  theme,
  onChange,
}: YamlSectionProps) {
  const { t } = useTranslation();
  const search = useSourceSearch();
  const [revealed, setRevealed] = useState(false);
  const masked = useMemo(() => redactYamlText(value), [value]);
  const searchReady =
    Boolean(search.searchQuery) && search.lastSearchedQuery === search.searchQuery;

  return (
    <div className="flex flex-col gap-4">
      {parseError ? (
        <Banner
          variant="error"
          icon={<WarningIcon weight="fill" />}
          title={t('settings.yaml.parse_error_title')}
          description={parseError}
        />
      ) : null}
      {sourceDirty ? (
        <Banner
          variant="default"
          title={t('settings.yaml.dirty_title')}
          description={t('settings.yaml.dirty_description')}
        />
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div className="relative min-w-0 flex-1 sm:max-w-sm">
            <Input
              className="w-full pr-24"
              aria-label={t('settings.yaml.search_label')}
              placeholder={t('settings.yaml.search_placeholder')}
              value={search.searchQuery}
              onChange={(event) => search.handleSearchChange(event.target.value)}
              onKeyDown={search.handleSearchKeyDown}
            />
            {searchReady ? (
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-kumo-subtle">
                {search.searchResults.total > 0
                  ? t('settings.yaml.search_count', {
                      current: search.searchResults.current,
                      total: search.searchResults.total,
                    })
                  : t('settings.yaml.search_none')}
              </span>
            ) : null}
          </div>
          <Button
            variant="secondary"
            shape="square"
            icon={<MagnifyingGlassIcon />}
            aria-label={t('settings.yaml.search_label')}
            disabled={!search.searchQuery}
            onClick={() => search.executeSearch('next')}
          />
          <Button
            variant="ghost"
            shape="square"
            icon={<CaretUpIcon />}
            aria-label={t('settings.yaml.search_prev')}
            disabled={!searchReady || search.searchResults.total === 0}
            onClick={search.handlePrevMatch}
          />
          <Button
            variant="ghost"
            shape="square"
            icon={<CaretDownIcon />}
            aria-label={t('settings.yaml.search_next')}
            disabled={!searchReady || search.searchResults.total === 0}
            onClick={search.handleNextMatch}
          />
        </div>
        <div className="flex items-center gap-3">
          <Text variant="secondary" size="sm">
            {revealed ? t('settings.yaml.secrets_visible') : t('settings.yaml.secrets_masked')}
          </Text>
          <Button
            variant="secondary"
            size="sm"
            icon={revealed ? <EyeSlashIcon /> : <EyeIcon />}
            onClick={() => setRevealed((current) => !current)}
          >
            {revealed ? t('settings.yaml.hide') : t('settings.yaml.reveal')}
          </Button>
        </div>
      </div>

      <div className="h-[65vh] min-h-80 overflow-hidden rounded-lg bg-kumo-base ring ring-kumo-line [&_.cm-editor]:h-full [&_.cm-theme]:h-full">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Loader />
            </div>
          }
        >
          <LazyConfigSourceEditor
            editorRef={search.editorRef}
            value={revealed ? value : masked}
            onChange={revealed ? onChange : () => undefined}
            theme={theme}
            editable={editable && revealed}
            placeholder={t('config_management.editor_placeholder')}
          />
        </Suspense>
      </div>
    </div>
  );
}
