import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Banner, Button, Collapsible, Loader, Pagination } from '@cloudflare/kumo';
import { ArrowClockwiseIcon } from '@phosphor-icons/react';
import { useInterval } from '@/hooks/useInterval';
import { useHeaderRefresh } from '@/hooks/useHeaderRefresh';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { Panel, PanelEmpty } from '@/components/ui/Panel';
import { copyToClipboard } from '@/utils/clipboard';
import { sidecarApi } from '@/services/api/sidecar';
import { PageHeader } from '@/features/overview/components/PageHeader';
import { usePolling } from '@/features/overview/usePolling';
import { useNow } from '@/features/overview/useNow';
import type { AccountRecord } from '@/features/overview/accounts';
import {
  getTypeLabel,
  isProblemAuthFile,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  type ResolvedTheme,
} from '@/features/authFiles/constants';
import { AUTH_FILES_CHANGED_EVENT } from '@/features/authFiles/authFilesEvents';
import { indexSidecarAccounts } from '@/features/authFiles/accountRows';
import { AccountsTable } from '@/features/authFiles/components/AccountsTable';
import { AuthFileCooldownSection } from '@/features/authFiles/components/AuthFileCooldownSection';
import { AuthFileDetailsSheet } from '@/features/authFiles/components/AuthFileDetailsSheet';
import { AuthFileQuotaSection } from '@/features/authFiles/components/AuthFileQuotaSection';
import { getAuthFileRefreshKey } from '@/features/authFiles/manualRefresh';
import { AuthFileRefreshResults } from '@/features/authFiles/components/AuthFileRefreshResults';
import { AuthFileModelsModal } from '@/features/authFiles/components/AuthFileModelsModal';
import { AuthFilesToolbar } from '@/features/authFiles/components/AuthFilesToolbar';
import { BatchActionBar } from '@/features/authFiles/components/BatchActionBar';
import { OAuthExcludedCard } from '@/features/authFiles/components/OAuthExcludedCard';
import { OAuthModelAliasCard } from '@/features/authFiles/components/OAuthModelAliasCard';
import { AddAccountButton } from '@/features/authFiles/addAccount/AddAccountButton';
import { AddAccountDialog } from '@/features/authFiles/addAccount/AddAccountDialog';
import {
  ADD_ACCOUNT_PARAM,
  addAccountParamValue,
  parseAddAccountTarget,
} from '@/features/authFiles/addAccount/addAccountLogic';
import { invalidateAuthFileDerivedCaches } from '@/features/authFiles/cacheInvalidation';
import {
  buildWildcardSearch,
  matchesAuthFileSearch,
  resolveAuthFileQuotaType,
  sortAuthFiles,
} from '@/features/authFiles/logic';
import { useAuthFilesData } from '@/features/authFiles/hooks/useAuthFilesData';
import { useAuthFilesModels } from '@/features/authFiles/hooks/useAuthFilesModels';
import { useAuthFilesOauth } from '@/features/authFiles/hooks/useAuthFilesOauth';
import { useAuthFilesPrefixProxyEditor } from '@/features/authFiles/hooks/useAuthFilesPrefixProxyEditor';
import {
  isAuthFilesStatusFilterMode,
  isAuthFilesSortMode,
  readAuthFilesUiState,
  writeAuthFilesUiState,
  type AuthFilesStatusFilterMode,
  type AuthFilesSortMode,
} from '@/features/authFiles/uiState';
import { useAuthStore, useNotificationStore, useThemeStore } from '@/stores';

const PAGE_SIZE = 25;

const resolveStatusFilterMode = (
  problemOnly: boolean,
  disabledOnly: boolean
): AuthFilesStatusFilterMode => {
  if (problemOnly) return 'problem';
  if (disabledOnly) return 'disabled';
  return 'all';
};

const normalizePersistedStatusFilterMode = (value: unknown): AuthFilesStatusFilterMode | null => {
  if (value === 'disabledProblem') return 'problem';
  return isAuthFilesStatusFilterMode(value) ? value : null;
};

export function AuthFilesPage() {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const resolvedTheme: ResolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const pageTransitionLayer = usePageTransitionLayer();
  const isCurrentLayer = pageTransitionLayer ? pageTransitionLayer.status === 'current' : true;
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const now = useNow();

  const [filter, setFilter] = useState<'all' | string>('all');
  const [statusFilterMode, setStatusFilterMode] = useState<AuthFilesStatusFilterMode>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'diagram' | 'list'>('list');
  const [sortMode, setSortMode] = useState<AuthFilesSortMode>('default');
  const [uiStateHydrated, setUiStateHydrated] = useState(false);
  const [modelRulesOpen, setModelRulesOpen] = useState(false);

  const addTarget = parseAddAccountTarget(searchParams.get(ADD_ACCOUNT_PARAM));
  const setAddTarget = useCallback(
    (target: string | null) => {
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current);
          if (target === null) next.delete(ADD_ACCOUNT_PARAM);
          else next.set(ADD_ACCOUNT_PARAM, addAccountParamValue(target));
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const sidecarAccounts = usePolling(() => sidecarApi.accounts(), 30_000);
  const sidecarUsage = usePolling(() => sidecarApi.usage('24h', 'account'), 60_000);
  const refreshSidecarAccounts = sidecarAccounts.refresh;
  const refreshSidecarUsage = sidecarUsage.refresh;
  const sidecarIndex = useMemo(
    () => indexSidecarAccounts((sidecarAccounts.data?.accounts ?? []) as AccountRecord[]),
    [sidecarAccounts.data]
  );

  const {
    modelsModalOpen,
    modelsLoading,
    modelsList,
    modelsFileName,
    modelsFileType,
    modelsError,
    showModels,
    closeModelsModal,
    invalidateModels,
  } = useAuthFilesModels();

  const invalidateDerivedCaches = useCallback(
    (names?: string[]) => invalidateAuthFileDerivedCaches(invalidateModels, names),
    [invalidateModels]
  );

  const {
    files,
    selectedFiles,
    selectionCount,
    loading,
    refreshing,
    error,
    uploading,
    deleting,
    deletingAll,
    statusUpdating,
    manualRefreshing,
    refreshingAllCredentials,
    refreshResults,
    closeRefreshResults,
    handleRefreshAllCredentials,
    cooldownResetting,
    batchStatusUpdating,
    fileInputRef,
    loadFiles,
    handleUploadClick,
    handleFileChange,
    handleDelete,
    handleDeleteAll,
    handleDownload,
    handleManualRefresh,
    handleCooldownReset,
    handleStatusToggle,
    toggleSelect,
    selectAllVisible,
    invertVisibleSelection,
    deselectAll,
    batchDownload,
    batchSetStatus,
    batchDelete,
  } = useAuthFilesData({ onFilesMutated: invalidateDerivedCaches });

  const {
    excluded,
    excludedError,
    modelAlias,
    modelAliasError,
    allProviderModels,
    loadExcluded,
    loadModelAlias,
    deleteExcluded,
    deleteModelAlias,
    handleMappingUpdate,
    handleDeleteLink,
    handleToggleFork,
    handleRenameAlias,
    handleDeleteAlias,
  } = useAuthFilesOauth({ viewMode, files });

  const disableControls = connectionStatus !== 'connected' || refreshingAllCredentials;

  const {
    prefixProxyEditor,
    prefixProxyUpdatedText,
    prefixProxyDirty,
    openPrefixProxyEditor,
    closePrefixProxyEditor,
    handlePrefixProxyChange,
    handlePrefixProxySave,
  } = useAuthFilesPrefixProxyEditor({
    disableControls,
    loadFiles,
    onFilesMutated: invalidateDerivedCaches,
  });

  const normalizedFilter = normalizeProviderKey(String(filter));
  const problemOnly = statusFilterMode === 'problem';
  const disabledOnly = statusFilterMode === 'disabled';
  const enabledOnly = statusFilterMode === 'enabled';

  useEffect(() => {
    const persisted = readAuthFilesUiState();
    if (persisted) {
      if (typeof persisted.filter === 'string' && persisted.filter.trim()) {
        setFilter(normalizeProviderKey(persisted.filter));
      }
      const persistedStatusFilterMode = normalizePersistedStatusFilterMode(
        persisted.statusFilterMode
      );
      if (persistedStatusFilterMode) {
        setStatusFilterMode(persistedStatusFilterMode);
      } else if (
        typeof persisted.problemOnly === 'boolean' ||
        typeof persisted.disabledOnly === 'boolean'
      ) {
        setStatusFilterMode(
          resolveStatusFilterMode(persisted.problemOnly === true, persisted.disabledOnly === true)
        );
      }
      if (typeof persisted.search === 'string') {
        setSearch(persisted.search);
      }
      if (typeof persisted.page === 'number' && Number.isFinite(persisted.page)) {
        setPage(Math.max(1, Math.round(persisted.page)));
      }
      if (isAuthFilesSortMode(persisted.sortMode)) {
        setSortMode(persisted.sortMode);
      }
    }
    setUiStateHydrated(true);
  }, []);

  useEffect(() => {
    if (!uiStateHydrated) return;
    writeAuthFilesUiState({
      filter,
      statusFilterMode,
      problemOnly,
      disabledOnly,
      search,
      page,
      sortMode,
    });
  }, [
    disabledOnly,
    filter,
    page,
    problemOnly,
    search,
    sortMode,
    statusFilterMode,
    uiStateHydrated,
  ]);

  const initialLoadDoneRef = useRef(false);

  const handleHeaderRefresh = useCallback(async () => {
    await Promise.all([
      loadFiles({ background: true }),
      loadExcluded(),
      loadModelAlias(),
      refreshSidecarAccounts(),
      refreshSidecarUsage(),
    ]);
  }, [loadFiles, loadExcluded, loadModelAlias, refreshSidecarAccounts, refreshSidecarUsage]);

  useHeaderRefresh(handleHeaderRefresh);

  useEffect(() => {
    if (!isCurrentLayer) return;
    void loadFiles(initialLoadDoneRef.current ? { background: true } : undefined);
    initialLoadDoneRef.current = true;
    loadExcluded();
    loadModelAlias();
  }, [isCurrentLayer, loadFiles, loadExcluded, loadModelAlias]);

  useEffect(() => {
    const handleChanged = () => {
      void loadFiles({ background: true });
      void refreshSidecarAccounts();
    };
    window.addEventListener(AUTH_FILES_CHANGED_EVENT, handleChanged);
    return () => window.removeEventListener(AUTH_FILES_CHANGED_EVENT, handleChanged);
  }, [loadFiles, refreshSidecarAccounts]);

  useInterval(
    () => {
      void loadFiles({ background: true }).catch(() => {});
    },
    isCurrentLayer ? 240_000 : null
  );

  const existingTypes = useMemo(() => {
    const types = new Set<string>();
    files.forEach((file) => {
      const type = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
      if (type) types.add(type);
    });
    return Array.from(types).sort();
  }, [files]);

  const providerOptions = useMemo(
    () => [
      { value: 'all', label: t('accounts.provider_all') },
      ...existingTypes.map((type) => ({ value: type, label: getTypeLabel(t, type) })),
    ],
    [existingTypes, t]
  );

  const statusFilterOptions = useMemo(
    () =>
      [
        { value: 'all', label: t('auth_files.problem_filter_all') },
        { value: 'enabled', label: t('auth_files.problem_filter_enabled') },
        { value: 'disabled', label: t('auth_files.problem_filter_disabled') },
        { value: 'problem', label: t('auth_files.problem_filter_problem') },
      ] satisfies Array<{ value: AuthFilesStatusFilterMode; label: string }>,
    [t]
  );

  const sortOptions = useMemo(
    () => [
      { value: 'default', label: t('auth_files.sort_default') },
      { value: 'az', label: t('auth_files.sort_az') },
      { value: 'priority', label: t('auth_files.sort_priority') },
    ],
    [t]
  );

  const normalizedSearch = search.trim();
  const wildcardSearch = useMemo(() => buildWildcardSearch(normalizedSearch), [normalizedSearch]);

  const filtered = useMemo(
    () =>
      files.filter((item) => {
        if (enabledOnly && item.disabled === true) return false;
        if (disabledOnly && item.disabled !== true) return false;
        if (problemOnly && !isProblemAuthFile(item)) return false;
        const type = normalizeProviderKey(String(item.type ?? item.provider ?? ''));
        const matchType = normalizedFilter === 'all' || type === normalizedFilter;
        return matchType && matchesAuthFileSearch(item, normalizedSearch, wildcardSearch);
      }),
    [
      disabledOnly,
      enabledOnly,
      files,
      normalizedFilter,
      normalizedSearch,
      problemOnly,
      wildcardSearch,
    ]
  );

  const sorted = useMemo(() => sortAuthFiles(filtered, sortMode), [filtered, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageItems = useMemo(() => sorted.slice(start, start + PAGE_SIZE), [sorted, start]);
  const selectablePageItems = useMemo(
    () => pageItems.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [pageItems]
  );
  const selectableFilteredItems = useMemo(
    () => sorted.filter((file) => !isRuntimeOnlyAuthFile(file)),
    [sorted]
  );
  const selectedNames = useMemo(() => Array.from(selectedFiles), [selectedFiles]);
  const selectedHasStatusUpdating = useMemo(
    () =>
      files.some(
        (file) =>
          selectedFiles.has(file.name) && statusUpdating[getAuthFileRefreshKey(file)] === true
      ),
    [files, selectedFiles, statusUpdating]
  );
  const batchStatusButtonsDisabled =
    disableControls ||
    selectedNames.length === 0 ||
    batchStatusUpdating ||
    selectedHasStatusUpdating;

  const activeCount = useMemo(() => files.filter((file) => file.disabled !== true).length, [files]);
  const problemCount = useMemo(() => files.filter(isProblemAuthFile).length, [files]);

  const copyTextWithNotification = useCallback(
    async (text: string) => {
      const copied = await copyToClipboard(text);
      showNotification(
        copied
          ? t('notification.link_copied', { defaultValue: 'Copied to clipboard' })
          : t('notification.copy_failed', { defaultValue: 'Copy failed' }),
        copied ? 'success' : 'error'
      );
    },
    [showNotification, t]
  );

  const openOAuthEditor = useCallback(
    (path: string, provider?: string) => {
      const providerValue = (provider || (filter !== 'all' ? String(filter) : '')).trim();
      const params = new URLSearchParams();
      if (providerValue) params.set('provider', providerValue);
      const nextSearch = params.toString();
      navigate(`/auth-files/${path}${nextSearch ? `?${nextSearch}` : ''}`, {
        state: { fromAuthFiles: true },
      });
    },
    [filter, navigate]
  );

  const clearFilters = useCallback(() => {
    setFilter('all');
    setStatusFilterMode('all');
    setSearch('');
    setPage(1);
  }, []);

  const deleteAllButtonLabel = (() => {
    if (enabledOnly || disabledOnly) return t('auth_files.delete_filtered_result_button');
    if (problemOnly) {
      return normalizedFilter === 'all'
        ? t('auth_files.delete_problem_button')
        : t('auth_files.delete_problem_button_with_type', {
            type: getTypeLabel(t, normalizedFilter),
          });
    }
    return normalizedFilter === 'all'
      ? t('auth_files.delete_all_button')
      : `${t('common.delete')} ${getTypeLabel(t, normalizedFilter)}`;
  })();

  const detailsFile = prefixProxyEditor
    ? (files.find((file) => file.name === prefixProxyEditor.fileName) ?? null)
    : null;
  const detailsQuotaType = detailsFile ? resolveAuthFileQuotaType(detailsFile, 'all') : null;
  const detailsAuthIndex =
    detailsFile && typeof detailsFile.authIndex === 'string' ? detailsFile.authIndex : null;
  const detailsHeader = detailsFile ? (
    <>
      <AuthFileCooldownSection
        snapshot={detailsFile.cooldownSnapshot}
        resetting={Boolean(detailsAuthIndex && cooldownResetting[detailsAuthIndex])}
        resetDisabled={
          disableControls || statusUpdating[getAuthFileRefreshKey(detailsFile)] === true
        }
        onReset={detailsAuthIndex ? () => handleCooldownReset(detailsFile) : undefined}
      />
      {detailsQuotaType && !isRuntimeOnlyAuthFile(detailsFile) ? (
        <AuthFileQuotaSection
          file={detailsFile}
          quotaType={detailsQuotaType}
          disableControls={disableControls}
        />
      ) : null}
    </>
  ) : null;

  const isFirstRunEmpty = !loading && files.length === 0 && !error;
  const isNoResults = !loading && files.length > 0 && pageItems.length === 0;

  return (
    <div className="flex w-full flex-col gap-6">
      <PageHeader
        title={t('auth_files.title')}
        description={[
          t('auth_files.meta_total', { count: files.length }),
          t('auth_files.meta_active', { count: activeCount }),
          ...(problemCount > 0 ? [t('auth_files.meta_problem', { count: problemCount })] : []),
        ].join(' · ')}
        actions={
          <>
            <Button
              variant="secondary"
              icon={ArrowClockwiseIcon}
              loading={refreshing}
              disabled={loading}
              onClick={() => void handleHeaderRefresh()}
            >
              {t('common.refresh')}
            </Button>
            <AddAccountButton
              onAdd={setAddTarget}
              onUpload={handleUploadClick}
              uploading={uploading}
              disabled={disableControls}
            />
          </>
        }
      />
      <AuthFileRefreshResults results={refreshResults} onClose={closeRefreshResults} />
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />

      <section className="flex flex-col gap-3" aria-label={t('auth_files.title_section')}>
        <AuthFilesToolbar
          search={search}
          onSearchChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          statusFilterMode={statusFilterMode}
          statusFilterOptions={statusFilterOptions}
          onStatusFilterChange={(mode) => {
            setStatusFilterMode(mode);
            setPage(1);
          }}
          providerFilter={normalizedFilter}
          providerOptions={providerOptions}
          onProviderFilterChange={(value) => {
            setFilter(value);
            setPage(1);
          }}
          sortMode={sortMode}
          sortOptions={sortOptions}
          onSortModeChange={(value) => {
            if (!isAuthFilesSortMode(value)) return;
            setSortMode(value);
            setPage(1);
          }}
          refreshTokensDisabled={
            disableControls || loading || Object.keys(manualRefreshing).length > 0
          }
          onRefreshTokens={handleRefreshAllCredentials}
          deleteLabel={deleteAllButtonLabel}
          deleteDisabled={disableControls || loading || deletingAll || files.length === 0}
          onDelete={() =>
            handleDeleteAll({
              filter,
              problemOnly,
              disabledOnly,
              enabledOnly,
              onResetFilterToAll: () => setFilter('all'),
              onResetProblemOnly: () => setStatusFilterMode('all'),
              onResetDisabledOnly: () => setStatusFilterMode('all'),
              onResetEnabledOnly: () => setStatusFilterMode('all'),
            })
          }
        />

        {error ? (
          <div role="alert">
            <Banner variant="error" size="sm" description={error} className="break-words" />
          </div>
        ) : null}

        <Panel padding="none">
          {loading ? (
            <div className="flex items-center justify-center gap-3 px-4 py-10 text-sm text-kumo-subtle">
              <Loader size="sm" />
              {t('common.loading')}
            </div>
          ) : isFirstRunEmpty ? (
            <PanelEmpty
              title={t('auth_files.empty_title')}
              description={t('auth_files.empty_desc')}
              contents={
                <AddAccountButton
                  onAdd={setAddTarget}
                  onUpload={handleUploadClick}
                  uploading={uploading}
                  disabled={disableControls}
                />
              }
            />
          ) : isNoResults ? (
            <PanelEmpty
              title={t('auth_files.search_empty_title')}
              description={t('auth_files.search_empty_desc')}
              contents={
                <Button variant="secondary" onClick={clearFilters}>
                  {t('auth_files.no_results_clear')}
                </Button>
              }
            />
          ) : (
            <AccountsTable
              files={pageItems}
              selected={selectedFiles}
              sidecarIndex={sidecarIndex}
              usage={sidecarUsage.data}
              now={now}
              resolvedTheme={resolvedTheme}
              disableControls={disableControls}
              deleting={deleting}
              statusUpdating={statusUpdating}
              manualRefreshing={manualRefreshing}
              cooldownResetting={cooldownResetting}
              onToggleSelect={toggleSelect}
              onSelectPage={() => selectAllVisible(pageItems)}
              onDeselectAll={deselectAll}
              onOpenDetails={openPrefixProxyEditor}
              onToggleStatus={handleStatusToggle}
              onManualRefresh={handleManualRefresh}
              onShowModels={showModels}
              onDownload={handleDownload}
              onDelete={handleDelete}
              onCooldownReset={handleCooldownReset}
            />
          )}
          {!loading && sorted.length > PAGE_SIZE ? (
            <div className="border-t border-kumo-line px-4 py-3">
              <Pagination
                page={currentPage}
                perPage={PAGE_SIZE}
                totalCount={sorted.length}
                setPage={setPage}
                controls="simple"
              />
            </div>
          ) : null}
        </Panel>
        {sidecarAccounts.error && !sidecarAccounts.data ? (
          <p className="m-0 text-xs text-kumo-subtle">{t('accounts.sidecar_unreachable')}</p>
        ) : null}
      </section>

      <Collapsible.Root open={modelRulesOpen} onOpenChange={setModelRulesOpen}>
        <Collapsible.DefaultTrigger>{t('accounts.model_rules')}</Collapsible.DefaultTrigger>
        <Collapsible.DefaultPanel>
          <div className="flex flex-col gap-4 pt-3">
            <p className="m-0 text-sm text-kumo-subtle">{t('accounts.model_rules_hint')}</p>
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <OAuthExcludedCard
                disableControls={disableControls}
                excludedError={excludedError}
                excluded={excluded}
                onRetry={loadExcluded}
                onAdd={() => openOAuthEditor('oauth-excluded')}
                onEdit={(provider) => openOAuthEditor('oauth-excluded', provider)}
                onDelete={deleteExcluded}
              />
              <OAuthModelAliasCard
                disableControls={disableControls}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                onRetry={loadModelAlias}
                onAdd={() => openOAuthEditor('oauth-model-alias')}
                onEditProvider={(provider) => openOAuthEditor('oauth-model-alias', provider)}
                onDeleteProvider={deleteModelAlias}
                modelAliasError={modelAliasError}
                modelAlias={modelAlias}
                allProviderModels={allProviderModels}
                onUpdate={handleMappingUpdate}
                onDeleteLink={handleDeleteLink}
                onToggleFork={handleToggleFork}
                onRenameAlias={handleRenameAlias}
                onDeleteAlias={handleDeleteAlias}
              />
            </div>
          </div>
        </Collapsible.DefaultPanel>
      </Collapsible.Root>

      <AuthFileModelsModal
        open={modelsModalOpen}
        fileName={modelsFileName}
        fileType={modelsFileType}
        loading={modelsLoading}
        error={modelsError}
        models={modelsList}
        excluded={excluded}
        onClose={closeModelsModal}
        onCopyText={copyTextWithNotification}
      />

      <AuthFileDetailsSheet
        disableControls={disableControls}
        editor={prefixProxyEditor}
        updatedText={prefixProxyUpdatedText}
        dirty={prefixProxyDirty}
        onClose={closePrefixProxyEditor}
        onCopyText={copyTextWithNotification}
        onSave={handlePrefixProxySave}
        onChange={handlePrefixProxyChange}
        header={detailsHeader}
      />

      <AddAccountDialog target={addTarget} onTargetChange={setAddTarget} />

      <BatchActionBar
        selectionCount={selectionCount}
        selectablePageCount={selectablePageItems.length}
        selectableFilteredCount={selectableFilteredItems.length}
        disableControls={disableControls}
        batchStatusDisabled={batchStatusButtonsDisabled}
        onSelectPage={() => selectAllVisible(pageItems)}
        onSelectFiltered={() => selectAllVisible(sorted)}
        onInvertPage={() => invertVisibleSelection(pageItems)}
        onDeselectAll={deselectAll}
        onDownload={() => void batchDownload(selectedNames)}
        onEnable={() => batchSetStatus(selectedNames, true)}
        onDisable={() => batchSetStatus(selectedNames, false)}
        onDelete={() => batchDelete(selectedNames)}
      />
    </div>
  );
}
