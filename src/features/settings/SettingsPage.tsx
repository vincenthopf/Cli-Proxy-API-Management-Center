import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { Badge, Banner, Button, Loader, Text } from '@cloudflare/kumo';
import { ArrowsClockwiseIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { usePageTransitionLayer } from '@/components/common/PageTransitionLayer';
import { useAuthStore, useConfigStore, useNotificationStore, useThemeStore } from '@/stores';
import { DiffDialog } from './components/DiffDialog';
import { SaveBar } from './components/SaveBar';
import { SettingsNav } from './components/SettingsNav';
import { AccessSection } from './sections/AccessSection';
import { AdvancedSection } from './sections/AdvancedSection';
import { NetworkSection } from './sections/NetworkSection';
import { OverviewSection } from './sections/OverviewSection';
import { ProvidersSection } from './sections/ProvidersSection';
import { RoutingSection } from './sections/RoutingSection';
import { YamlSection } from './sections/YamlSection';
import { SettingsFormContext, type FieldFocusRequest } from './settingsForm';
import {
  editorModeForSection,
  planSectionTransition,
  sectionForField,
  sectionFromPathname,
  settingsPath,
  settingsRedirectTarget,
  type SettingsSectionId,
} from './settingsLayout';
import { useSettingsEditor } from './useSettingsEditor';

function replaceSettingsUrl(path: string) {
  if (typeof window === 'undefined') return;
  const nextHash = `#${path}`;
  if (window.location.hash === nextHash) return;
  window.history.replaceState(window.history.state, '', nextHash);
}

function readInitialRequest(pathname: string, search: string) {
  const fieldId = new URLSearchParams(search).get('field');
  const fieldSection = sectionForField(fieldId);
  return {
    section: fieldSection ?? sectionFromPathname(pathname),
    focus: fieldSection && fieldId ? { fieldId, id: 1 } : null,
  };
}

export function SettingsPage() {
  const location = useLocation();
  const redirect = settingsRedirectTarget(location.pathname, location.search);
  if (redirect) return <Navigate to={redirect} replace />;
  return <SettingsEditorPage />;
}

function SettingsEditorPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const layer = usePageTransitionLayer();
  const isCurrentLayer = layer ? layer.isCurrentLayer : true;
  const showNotification = useNotificationStore((state) => state.showNotification);
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const fetchConfig = useConfigStore((state) => state.fetchConfig);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const [initialRequest] = useState(() => readInitialRequest(location.pathname, location.search));
  const [section, setSection] = useState<SettingsSectionId>(initialRequest.section);
  const [focus, setFocus] = useState<FieldFocusRequest | null>(initialRequest.focus);
  const mode = editorModeForSection(section);

  const editor = useSettingsEditor({ mode, focus, guardEnabled: isCurrentLayer });
  const {
    doc,
    disconnected,
    changedIds,
    changedCounts,
    errorCounts,
    totalErrors,
    status,
    saveDisabled,
    saveStatusText,
    formValue,
    initialLoading,
  } = editor;
  const { visualDirty, visualParseError, loadVisualValuesFromYaml, applyVisualChangesToYaml } =
    editor.visual;

  useEffect(() => {
    replaceSettingsUrl(settingsPath(initialRequest.section));
  }, [initialRequest.section]);

  useEffect(() => {
    if (connectionStatus !== 'connected') return;
    fetchConfig().catch(() => undefined);
  }, [connectionStatus, fetchConfig]);

  const selectSection = useCallback(
    (next: SettingsSectionId, fieldId?: string) => {
      const plan = planSectionTransition({
        from: section,
        to: next,
        sourceDirty: doc.sourceDirty,
        visualDirty,
        visualParseError,
      });
      if (plan.kind === 'block_source_dirty') {
        showNotification(t('config_management.source_changes_before_visual'), 'warning');
        return;
      }
      if (plan.syncSourceFromVisual) {
        const nextContent = applyVisualChangesToYaml(doc.content, 'draft');
        if (nextContent !== doc.content) doc.syncContentFromVisual(nextContent);
      }
      if (plan.reloadVisualFromSource) {
        const result = loadVisualValuesFromYaml(doc.content);
        if (!result.ok) {
          showNotification(
            t('config_management.visual_mode_unavailable_detail', { message: result.error }),
            'error'
          );
          return;
        }
      }
      setSection(next);
      replaceSettingsUrl(settingsPath(next));
      if (fieldId) {
        setFocus({ fieldId, id: Date.now() });
      } else {
        requestAnimationFrame(() => headingRef.current?.scrollIntoView({ block: 'nearest' }));
      }
    },
    [
      applyVisualChangesToYaml,
      doc,
      loadVisualValuesFromYaml,
      section,
      showNotification,
      t,
      visualDirty,
      visualParseError,
    ]
  );

  useEffect(() => {
    if (mode !== 'visual' || !visualParseError) return;
    setSection('yaml');
    replaceSettingsUrl(settingsPath('yaml'));
    showNotification(
      t('config_management.visual_mode_unavailable_detail', { message: visualParseError }),
      'error'
    );
  }, [mode, showNotification, t, visualParseError]);

  const openYaml = useCallback(() => selectSection('yaml'), [selectSection]);

  const statusBadge = (() => {
    switch (status.tone) {
      case 'error':
        return <Badge variant="error">{t(status.shortLabelKey)}</Badge>;
      case 'warning':
        return <Badge variant="warning">{t(status.shortLabelKey)}</Badge>;
      case 'ok':
        return <Badge variant="success">{t('settings.status.saved')}</Badge>;
      default:
        return <Badge variant="neutral">{t(status.shortLabelKey)}</Badge>;
    }
  })();

  const renderSection = () => {
    switch (section) {
      case 'overview':
        return (
          <OverviewSection
            changedCounts={changedCounts}
            errorCounts={errorCounts}
            onOpen={selectSection}
          />
        );
      case 'access':
        return <AccessSection />;
      case 'routing':
        return <RoutingSection />;
      case 'network':
        return <NetworkSection onOpenYaml={openYaml} />;
      case 'providers':
        return <ProvidersSection />;
      case 'advanced':
        return <AdvancedSection onOpenYaml={openYaml} />;
      case 'yaml':
        return (
          <YamlSection
            value={doc.content}
            editable={!disconnected && !doc.loading && !doc.saving && !doc.diffModalOpen}
            sourceDirty={doc.sourceDirty}
            parseError={visualParseError}
            theme={resolvedTheme}
            onChange={doc.handleChange}
          />
        );
    }
  };

  return (
    <SettingsFormContext.Provider value={formValue}>
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 md:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-3">
              <Text variant="heading" size="lg" as="h1">
                {t('settings.title')}
              </Text>
              {statusBadge}
            </div>
            <Text variant="secondary">{t('settings.subtitle')}</Text>
          </div>
          <Button
            variant="secondary"
            icon={<ArrowsClockwiseIcon />}
            loading={doc.loading && !initialLoading}
            disabled={doc.loading || doc.saving}
            onClick={doc.handleReload}
          >
            {t('settings.reload')}
          </Button>
        </header>

        {doc.error ? (
          <Banner
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title={t('settings.errors.load_title')}
            description={doc.error}
          />
        ) : null}
        {!doc.error && visualParseError && section !== 'yaml' ? (
          <Banner
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title={t('config_management.visual_mode_unavailable')}
            description={visualParseError}
          />
        ) : null}
        {doc.recoveryRequired ? (
          <Banner
            variant="error"
            icon={<WarningCircleIcon weight="fill" />}
            title={t('settings.errors.recovery_title')}
            description={t('config_management.precise_save_recovery_required')}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[15rem_minmax(0,1fr)]">
          <aside className="md:sticky md:top-6 md:self-start">
            <SettingsNav
              active={section}
              changedCounts={changedCounts}
              errorCounts={errorCounts}
              sourceDirty={doc.sourceDirty}
              onSelect={selectSection}
            />
          </aside>

          <div className="flex min-w-0 flex-col gap-5">
            <div className="flex flex-col gap-1">
              <Text variant="heading" size="lg" as="h2">
                <span ref={headingRef} className="scroll-mt-6">
                  {t(`settings.sections.${section}.title`)}
                </span>
              </Text>
              <Text variant="secondary">{t(`settings.sections.${section}.description`)}</Text>
            </div>

            {initialLoading ? (
              <div className="flex items-center gap-3 py-16 text-kumo-subtle">
                <Loader />
                <Text variant="secondary">{t('config_management.status_loading')}</Text>
              </div>
            ) : (
              renderSection()
            )}

            {isCurrentLayer && doc.isDirty ? (
              <SaveBar
                changedCount={changedIds.length}
                sourceDirty={doc.sourceDirty}
                errorCount={mode === 'visual' ? totalErrors : 0}
                statusText={saveStatusText}
                saving={doc.saving}
                saveDisabled={saveDisabled}
                discardDisabled={doc.loading || doc.saving}
                onSave={() => void doc.handleSave()}
                onDiscard={doc.handleDiscard}
              />
            ) : null}
          </div>
        </div>

        <DiffDialog
          open={doc.diffModalOpen}
          original={doc.serverYaml}
          modified={doc.mergedYaml}
          saving={doc.saving}
          onConfirm={() => void doc.handleConfirmSave()}
          onCancel={doc.closeDiff}
        />
      </div>
    </SettingsFormContext.Provider>
  );
}
