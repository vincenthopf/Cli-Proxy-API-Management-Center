import { useTranslation } from 'react-i18next';
import { Badge } from '@cloudflare/kumo';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { AuthFileModelItem } from '@/features/authFiles/constants';
import { isModelExcluded } from '@/features/authFiles/constants';
import styles from './AuthFileModelsModal.module.scss';

export type AuthFileModelsModalProps = {
  open: boolean;
  fileName: string;
  fileType: string;
  loading: boolean;
  error: 'unsupported' | null;
  models: AuthFileModelItem[];
  excluded: Record<string, string[]>;
  onClose: () => void;
  onCopyText: (text: string) => void;
};

export function AuthFileModelsModal(props: AuthFileModelsModalProps) {
  const { t } = useTranslation();
  const { open, fileName, fileType, loading, error, models, excluded, onClose, onCopyText } = props;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('auth_files.models_title') + ` - ${fileName}`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          {t('common.close')}
        </Button>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center gap-2 py-6 text-sm text-kumo-subtle">
          <LoadingSpinner size={14} />
          {t('auth_files.models_loading')}
        </div>
      ) : error === 'unsupported' ? (
        <EmptyState
          title={t('auth_files.models_unsupported')}
          description={t('auth_files.models_unsupported_desc')}
        />
      ) : models.length === 0 ? (
        <EmptyState
          title={t('auth_files.models_empty')}
          description={t('auth_files.models_empty_desc')}
        />
      ) : (
        <div className={styles.list}>
          {models.map((model) => {
            const excludedModel = isModelExcluded(model.id, fileType, excluded);
            return (
              <button
                type="button"
                key={model.id}
                className={`${styles.item} ${excludedModel ? styles.itemExcluded : ''}`}
                onClick={() => {
                  onCopyText(model.id);
                }}
                title={
                  excludedModel
                    ? t('auth_files.models_excluded_hint')
                    : t('common.copy')
                }
              >
                <span className={styles.modelId}>{model.id}</span>
                {model.display_name && model.display_name !== model.id && (
                  <span className={styles.modelDisplayName}>{model.display_name}</span>
                )}
                {model.type && <Badge variant="outline">{model.type}</Badge>}
                {excludedModel && (
                  <span className={styles.excludedBadge}>
                    <Badge variant="error">{t('auth_files.models_excluded_badge')}</Badge>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
