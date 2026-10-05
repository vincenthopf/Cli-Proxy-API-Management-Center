import type { VisualConfigValidationErrors } from '@/types/visualConfig';

export function countTotalErrors(
  validationErrors: VisualConfigValidationErrors | undefined,
  hasPayloadValidationErrors: boolean
): number {
  const fieldErrors = Object.values(validationErrors ?? {}).filter(Boolean).length;
  return fieldErrors + (hasPayloadValidationErrors ? 1 : 0);
}

export type ConfigStatusKey =
  | 'disconnected'
  | 'loading'
  | 'load_failed'
  | 'yaml_error'
  | 'validation_blocked'
  | 'saving'
  | 'dirty'
  | 'synced';

export type ConfigStatusTone = 'error' | 'warning' | 'busy' | 'muted' | 'ok';

export type ConfigStatus = {
  key: ConfigStatusKey;
  labelKey: string;
  shortLabelKey: string;
  tone: ConfigStatusTone;
};

export type ConfigStatusInput = {
  disconnected: boolean;
  loading: boolean;
  loadFailed: boolean;
  yamlError: boolean;
  validationBlocked: boolean;
  saving: boolean;
  dirty: boolean;
};

export function resolveStatus(input: ConfigStatusInput): ConfigStatus {
  if (input.disconnected) {
    return {
      key: 'disconnected',
      labelKey: 'config_management.status_disconnected',
      shortLabelKey: 'config_management.status_disconnected_short',
      tone: 'muted',
    };
  }
  if (input.loading) {
    return {
      key: 'loading',
      labelKey: 'config_management.status_loading',
      shortLabelKey: 'config_management.status_loading_short',
      tone: 'busy',
    };
  }
  if (input.loadFailed) {
    return {
      key: 'load_failed',
      labelKey: 'config_management.status_load_failed',
      shortLabelKey: 'config_management.status_load_failed_short',
      tone: 'error',
    };
  }
  if (input.yamlError) {
    return {
      key: 'yaml_error',
      labelKey: 'config_management.visual_mode_unavailable',
      shortLabelKey: 'config_management.visual_mode_unavailable_short',
      tone: 'error',
    };
  }
  if (input.validationBlocked) {
    return {
      key: 'validation_blocked',
      labelKey: 'config_management.visual.validation.validation_blocked',
      shortLabelKey: 'config_management.validation_blocked_short',
      tone: 'error',
    };
  }
  if (input.saving) {
    return {
      key: 'saving',
      labelKey: 'config_management.status_saving',
      shortLabelKey: 'config_management.status_saving_short',
      tone: 'busy',
    };
  }
  if (input.dirty) {
    return {
      key: 'dirty',
      labelKey: 'config_management.status_dirty',
      shortLabelKey: 'config_management.status_dirty_short',
      tone: 'warning',
    };
  }
  return {
    key: 'synced',
    labelKey: 'config_management.status_loaded',
    shortLabelKey: 'config_management.status_loaded_short',
    tone: 'ok',
  };
}
