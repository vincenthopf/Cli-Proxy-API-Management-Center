import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { authFilesApi } from '@/services/api';
import { notifyAuthFilesChanged } from '@/features/authFiles/authFilesEvents';
import { useNotificationStore } from '@/stores';
import { formatFileSize } from '@/utils/format';
import { MAX_AUTH_FILE_SIZE } from '@/utils/constants';

export type UseAuthFileUploadOptions = {
  onUploaded?: (names?: string[]) => void | Promise<void>;
};

export function useAuthFileUpload(options?: UseAuthFileUploadOptions) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const uploadPendingRef = useRef(false);
  const onUploadedRef = useRef(options?.onUploaded);
  useEffect(() => {
    onUploadedRef.current = options?.onUploaded;
  }, [options?.onUploaded]);

  const handleUploadClick = useCallback(() => {
    if (uploadPendingRef.current) return;
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files;
      if (!fileList || fileList.length === 0) return;

      const validFiles: File[] = [];
      const invalidFiles: string[] = [];
      const oversizedFiles: string[] = [];

      Array.from(fileList).forEach((file) => {
        if (!file.name.endsWith('.json')) {
          invalidFiles.push(file.name);
          return;
        }
        if (file.size > MAX_AUTH_FILE_SIZE) {
          oversizedFiles.push(file.name);
          return;
        }
        validFiles.push(file);
      });

      if (invalidFiles.length > 0) {
        showNotification(t('auth_files.upload_error_json'), 'error');
      }
      if (oversizedFiles.length > 0) {
        showNotification(
          t('auth_files.upload_error_size', { maxSize: formatFileSize(MAX_AUTH_FILE_SIZE) }),
          'error'
        );
      }

      if (validFiles.length === 0 || uploadPendingRef.current) {
        event.target.value = '';
        return;
      }

      uploadPendingRef.current = true;
      setUploading(true);
      try {
        const result = await authFilesApi.uploadFiles(validFiles);
        const successCount = result.uploaded;

        if (successCount > 0) {
          const suffix = validFiles.length > 1 ? ` (${successCount}/${validFiles.length})` : '';
          showNotification(
            `${t('auth_files.upload_success')}${suffix}`,
            result.failed.length ? 'warning' : 'success'
          );
          notifyAuthFilesChanged();
          await onUploadedRef.current?.(result.files.length > 0 ? result.files : undefined);
        }

        if (result.failed.length > 0) {
          const details = result.failed.map((item) => `${item.name}: ${item.error}`).join('; ');
          showNotification(`${t('notification.upload_failed')}: ${details}`, 'error');
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        showNotification(`${t('notification.upload_failed')}: ${errorMessage}`, 'error');
      } finally {
        uploadPendingRef.current = false;
        setUploading(false);
        event.target.value = '';
      }
    },
    [showNotification, t]
  );

  return { uploading, fileInputRef, handleUploadClick, handleFileChange };
}

export type AuthFileUpload = ReturnType<typeof useAuthFileUpload>;
