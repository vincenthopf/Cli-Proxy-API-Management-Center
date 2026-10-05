import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Dialog, Input, SensitiveInput, Text } from '@cloudflare/kumo';
import { PanelEmpty } from '@/components/ui/Panel';
import { KeyIcon, PencilSimpleIcon, PlusIcon, TrashIcon } from '@phosphor-icons/react';
import { useAuthStore } from '@/stores';
import {
  apiKeyNameFingerprint,
  readApiKeyNames,
  saveApiKeyName,
} from '@/features/config/apiKeyNames';
import { ApiKeyStrengthMeter } from '@/features/config/components/blocks/ApiKeyStrengthMeter';
import { generateSecureApiKey } from '@/utils/apiKey';
import { isValidApiKeyCharset } from '@/utils/validation';
import { parseClientApiKeys } from '../settingsLayout';
import { ConfirmDialog } from './ConfirmDialog';

type ApiKeysEditorProps = {
  value: string;
  disabled: boolean;
  onChange: (next: string) => void;
};

type EditorState = { mode: 'add' } | { mode: 'edit'; index: number };

export function ApiKeysEditor(props: ApiKeysEditorProps) {
  const apiBase = useAuthStore((state) => state.apiBase);
  return <ScopedApiKeysEditor key={apiBase} apiBase={apiBase} {...props} />;
}

function ScopedApiKeysEditor({
  value,
  disabled,
  onChange,
  apiBase,
}: ApiKeysEditorProps & { apiBase: string }) {
  const { t } = useTranslation();
  const keys = useMemo(() => parseClientApiKeys(value), [value]);
  const [names, setNames] = useState(() => readApiKeyNames(apiBase));
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [nameDraft, setNameDraft] = useState('');
  const [keyDraft, setKeyDraft] = useState('');
  const [formError, setFormError] = useState('');
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  const nameFor = (key: string) => names[apiKeyNameFingerprint(apiBase, key)];

  const openAdd = () => {
    setNameDraft('');
    setKeyDraft('');
    setFormError('');
    setEditor({ mode: 'add' });
  };

  const openEdit = (index: number) => {
    const latest = readApiKeyNames(apiBase);
    setNames(latest);
    const key = keys[index] ?? '';
    setNameDraft(latest[apiKeyNameFingerprint(apiBase, key)] ?? '');
    setKeyDraft(key);
    setFormError('');
    setEditor({ mode: 'edit', index });
  };

  const closeEditor = () => {
    setEditor(null);
    setKeyDraft('');
    setFormError('');
  };

  const submit = () => {
    if (!editor) return;
    const trimmed = keyDraft.trim();
    if (!trimmed) {
      setFormError(t('config_management.visual.api_keys.error_empty'));
      return;
    }
    if (!isValidApiKeyCharset(trimmed)) {
      setFormError(t('config_management.visual.api_keys.error_invalid'));
      return;
    }
    const duplicate = keys.some(
      (key, index) => key === trimmed && (editor.mode === 'add' || index !== editor.index)
    );
    if (duplicate) {
      setFormError(t('settings.access.key_duplicate'));
      return;
    }
    if (!saveApiKeyName(apiBase, trimmed, nameDraft)) {
      setFormError(t('config_management.visual.api_keys.name_save_error'));
      return;
    }
    setNames(readApiKeyNames(apiBase));
    const next =
      editor.mode === 'add'
        ? [...keys, trimmed]
        : keys.map((key, index) => (index === editor.index ? trimmed : key));
    if (next.join('\n') !== keys.join('\n')) onChange(next.join('\n'));
    closeEditor();
  };

  const confirmRemove = () => {
    if (removeIndex === null) return;
    onChange(keys.filter((_, index) => index !== removeIndex).join('\n'));
    setRemoveIndex(null);
  };

  const removeLabel =
    removeIndex !== null
      ? (nameFor(keys[removeIndex] ?? '') ?? t('settings.access.key_n', { index: removeIndex + 1 }))
      : '';

  return (
    <div className="flex flex-col gap-3">
      {keys.length === 0 ? (
        <PanelEmpty
          icon={<KeyIcon size={32} className="text-kumo-inactive" />}
          title={t('settings.access.keys_empty_title')}
          description={t('settings.access.keys_empty_description')}
        />
      ) : (
        <ul className="flex flex-col divide-y divide-kumo-line">
          {keys.map((key, index) => {
            const label = nameFor(key) ?? t('settings.access.key_n', { index: index + 1 });
            return (
              <li
                key={`${index}-${apiKeyNameFingerprint(apiBase, key)}`}
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:gap-4"
              >
                <Text bold truncate>
                  <span className="block sm:w-44">{label}</span>
                </Text>
                <div className="min-w-0 flex-1">
                  <SensitiveInput
                    className="w-full font-mono"
                    aria-label={label}
                    value={key}
                    readOnly
                  />
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    shape="square"
                    icon={<PencilSimpleIcon />}
                    aria-label={t('settings.access.edit_key', { label })}
                    disabled={disabled}
                    onClick={() => openEdit(index)}
                  />
                  <Button
                    variant="ghost"
                    shape="square"
                    icon={<TrashIcon />}
                    aria-label={t('settings.access.remove_key', { label })}
                    disabled={disabled}
                    onClick={() => setRemoveIndex(index)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <div>
        <Button variant="secondary" icon={<PlusIcon />} disabled={disabled} onClick={openAdd}>
          {t('settings.access.add_key')}
        </Button>
      </div>

      <Dialog.Root
        open={editor !== null}
        onOpenChange={(next) => {
          if (!next) closeEditor();
        }}
      >
        <Dialog size="lg" className="flex flex-col gap-5 p-6">
          <Dialog.Title className="text-lg font-semibold text-kumo-default">
            {editor?.mode === 'edit'
              ? t('settings.access.edit_key_title')
              : t('settings.access.add_key_title')}
          </Dialog.Title>
          <Input
            label={t('settings.access.key_name_label')}
            description={t('settings.access.key_name_description')}
            placeholder={t('config_management.visual.api_keys.name_placeholder')}
            value={nameDraft}
            onChange={(event) => setNameDraft(event.target.value)}
          />
          <div className="flex flex-col gap-2">
            <div className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <Input
                  className="w-full font-mono"
                  label={t('settings.access.key_label')}
                  placeholder={t('config_management.visual.api_keys.input_placeholder')}
                  autoComplete="off"
                  value={keyDraft}
                  error={formError || undefined}
                  onChange={(event) => {
                    setKeyDraft(event.target.value);
                    setFormError('');
                  }}
                />
              </div>
              <Button
                variant="secondary"
                className={formError ? 'mb-7' : undefined}
                onClick={() => {
                  setKeyDraft(generateSecureApiKey());
                  setFormError('');
                }}
              >
                {t('config_management.visual.api_keys.generate')}
              </Button>
            </div>
            <ApiKeyStrengthMeter value={keyDraft} />
            <Text variant="secondary" size="sm">
              {t('settings.access.key_save_note')}
            </Text>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeEditor}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={submit}>
              {editor?.mode === 'edit'
                ? t('settings.access.update_key')
                : t('settings.access.add_key')}
            </Button>
          </div>
        </Dialog>
      </Dialog.Root>

      <ConfirmDialog
        open={removeIndex !== null}
        title={t('settings.access.remove_title', { label: removeLabel })}
        description={t('settings.access.remove_description')}
        confirmLabel={t('settings.access.remove_confirm')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={confirmRemove}
        onCancel={() => setRemoveIndex(null)}
      />
    </div>
  );
}
