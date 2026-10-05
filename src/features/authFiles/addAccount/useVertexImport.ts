import { useCallback, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '@/stores';
import { vertexApi, type VertexImportResponse } from '@/services/api/vertex';
import { getErrorMessage } from '@/utils/helpers';
import { notifyAuthFilesChanged } from '@/features/authFiles/authFilesEvents';

export interface VertexImportResult {
  projectId?: string;
  email?: string;
  location?: string;
  authFile?: string;
}

export interface VertexImportState {
  file?: File;
  fileName: string;
  location: string;
  loading: boolean;
  error?: string;
  result?: VertexImportResult;
}

const INITIAL_STATE: VertexImportState = { fileName: '', location: '', loading: false };

export function useVertexImport() {
  const { t } = useTranslation();
  const { showNotification } = useNotificationStore();
  const [state, setState] = useState<VertexImportState>(INITIAL_STATE);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const pickFile = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.name.endsWith('.json')) {
        showNotification(t('vertex_import.file_required'), 'warning');
        event.target.value = '';
        return;
      }
      setState((prev) => ({
        ...prev,
        file,
        fileName: file.name,
        error: undefined,
        result: undefined,
      }));
      event.target.value = '';
    },
    [showNotification, t]
  );

  const setLocation = useCallback((location: string) => {
    setState((prev) => ({ ...prev, location }));
  }, []);

  const reset = useCallback(() => setState(INITIAL_STATE), []);

  const importCredential = useCallback(async () => {
    if (!state.file) {
      const message = t('vertex_import.file_required');
      setState((prev) => ({ ...prev, error: message }));
      showNotification(message, 'warning');
      return;
    }
    const location = state.location.trim();
    setState((prev) => ({ ...prev, loading: true, error: undefined, result: undefined }));
    try {
      const res: VertexImportResponse = await vertexApi.importCredential(
        state.file,
        location || undefined
      );
      const result: VertexImportResult = {
        projectId: res.project_id,
        email: res.email,
        location: res.location,
        authFile: res['auth-file'] ?? res.auth_file,
      };
      setState((prev) => ({ ...prev, loading: false, result }));
      notifyAuthFilesChanged();
      showNotification(t('vertex_import.success'), 'success');
    } catch (err: unknown) {
      const message = getErrorMessage(err);
      setState((prev) => ({
        ...prev,
        loading: false,
        error: message || t('notification.upload_failed'),
      }));
      showNotification(
        message
          ? `${t('notification.upload_failed')}: ${message}`
          : t('notification.upload_failed'),
        'error'
      );
    }
  }, [showNotification, state.file, state.location, t]);

  return { state, fileInputRef, pickFile, handleFileChange, setLocation, importCredential, reset };
}

export type VertexImport = ReturnType<typeof useVertexImport>;
