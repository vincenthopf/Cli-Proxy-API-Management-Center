import { useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { BlockerFunction } from 'react-router-dom';
import { prefersReducedMotion } from '@/hooks/motion';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { useVisualConfig } from '@/hooks/useVisualConfig';
import { useConfigDocument } from '@/features/config/hooks/useConfigDocument';
import type { ConfigEditorMode } from '@/features/config/constants';
import { configFieldDomId } from '@/features/config/searchIndex';
import { countTotalErrors, resolveStatus } from '@/features/config/uiState';
import { useAuthStore } from '@/stores';
import type { FieldFocusRequest, SettingsFormValue } from './settingsForm';
import {
  changedFieldIds as toChangedFieldIds,
  countErrorsBySection,
  countFieldsBySection,
} from './settingsLayout';

const HIGHLIGHT_CLASSES = ['ring-2', 'ring-kumo-brand', 'bg-kumo-tint'];

export function useSettingsEditor({
  mode,
  focus,
  guardEnabled,
}: {
  mode: ConfigEditorMode;
  focus: FieldFocusRequest | null;
  guardEnabled: boolean;
}) {
  const { t } = useTranslation();
  const connectionStatus = useAuthStore((state) => state.connectionStatus);
  const visual = useVisualConfig();
  const {
    visualValues,
    visualDirty,
    visualDirtyFields,
    visualParseError,
    visualValidationErrors,
    visualHasPayloadValidationErrors,
    loadVisualValuesFromYaml,
    rebaseVisualValuesFromYaml,
    applyVisualChangesToYaml,
    setVisualValues,
  } = visual;

  const doc = useConfigDocument({
    mode,
    visualDirty,
    visualParseError,
    loadVisualValuesFromYaml,
    rebaseVisualValuesFromYaml,
    applyVisualChangesToYaml,
  });

  const shouldBlock = useCallback<BlockerFunction>(
    ({ currentLocation, nextLocation }) =>
      doc.isDirty && currentLocation.pathname !== nextLocation.pathname,
    [doc.isDirty]
  );
  const unsavedDialog = useMemo(
    () => ({
      title: t('common.unsaved_changes_title'),
      message: t('common.unsaved_changes_message'),
      confirmText: t('common.confirm'),
      cancelText: t('common.cancel'),
    }),
    [t]
  );
  useUnsavedChangesGuard({ enabled: guardEnabled, shouldBlock, dialog: unsavedDialog });

  useEffect(() => {
    if (!focus || doc.loading) return;
    let frame = 0;
    let timer = 0;
    let attempts = 0;
    let highlighted: HTMLElement | null = null;
    const run = () => {
      const element = document.getElementById(configFieldDomId(focus.fieldId));
      if (!element || element.getClientRects().length === 0) {
        attempts += 1;
        if (attempts < 12) frame = requestAnimationFrame(run);
        return;
      }
      element.scrollIntoView({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
      });
      element.classList.add(...HIGHLIGHT_CLASSES);
      highlighted = element;
      timer = window.setTimeout(() => {
        element.classList.remove(...HIGHLIGHT_CLASSES);
        highlighted = null;
      }, 1800);
    };
    frame = requestAnimationFrame(run);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      highlighted?.classList.remove(...HIGHLIGHT_CLASSES);
    };
  }, [doc.loading, focus]);

  const changedIds = useMemo(() => toChangedFieldIds(visualDirtyFields), [visualDirtyFields]);
  const changedSet = useMemo(() => new Set(changedIds), [changedIds]);
  const changedCounts = useMemo(() => countFieldsBySection(changedIds), [changedIds]);
  const errorCounts = useMemo(
    () => countErrorsBySection(visualValidationErrors, visualHasPayloadValidationErrors),
    [visualHasPayloadValidationErrors, visualValidationErrors]
  );
  const totalErrors = countTotalErrors(visualValidationErrors, visualHasPayloadValidationErrors);

  const disconnected = connectionStatus !== 'connected';
  const validationBlocked = mode === 'visual' && totalErrors > 0;
  const status = resolveStatus({
    disconnected,
    loading: doc.loading,
    loadFailed: Boolean(doc.error),
    yamlError: Boolean(visualParseError),
    validationBlocked,
    saving: doc.saving,
    dirty: doc.isDirty,
  });
  const saveDisabled =
    disconnected ||
    doc.loading ||
    doc.saving ||
    !doc.isDirty ||
    doc.diffModalOpen ||
    Boolean(visualParseError && mode === 'visual') ||
    validationBlocked;
  const formDisabled =
    disconnected || doc.loading || doc.saving || doc.diffModalOpen || doc.recoveryRequired;

  const formValue = useMemo<SettingsFormValue>(
    () => ({
      values: visualValues,
      validationErrors: visualValidationErrors,
      hasPayloadValidationErrors: visualHasPayloadValidationErrors,
      changedFieldIds: changedSet,
      disabled: formDisabled,
      focus,
      onChange: setVisualValues,
    }),
    [
      changedSet,
      focus,
      formDisabled,
      setVisualValues,
      visualHasPayloadValidationErrors,
      visualValidationErrors,
      visualValues,
    ]
  );

  const saveStatusText = doc.recoveryRequired
    ? t('config_management.precise_save_recovery_required')
    : status.key === 'disconnected' || status.key === 'yaml_error' || status.key === 'saving'
      ? t(status.labelKey)
      : undefined;

  const reloadIfClean = useCallback(() => {
    if (!doc.isDirty) void doc.loadConfig();
  }, [doc]);

  return {
    visual,
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
    reloadIfClean,
    initialLoading: doc.loading && doc.serverYaml === '',
  };
}
