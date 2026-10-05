import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SensitiveInput } from '@cloudflare/kumo';
import { ApiKeysEditor } from '../components/ApiKeysEditor';
import { SettingNote } from '../components/SettingNote';
import { SettingRow } from '../components/SettingRow';
import { SettingsGroup } from '../components/SettingsGroup';
import { SwitchSetting, TextSetting } from '../components/controls';
import { useFieldText, useSettingsForm } from '../settingsForm';

export function AccessSection() {
  const { t } = useTranslation();
  const { values, disabled, changedFieldIds, onChange } = useSettingsForm();
  const fieldText = useFieldText();
  const apiKeysText = fieldText('apiKeys');
  const secretText = fieldText('rmSecretKey');
  const secretChanged = changedFieldIds.has('rmSecretKey');
  const [savedSecret, setSavedSecret] = useState(values.rmSecretKey);
  if (!secretChanged && savedSecret !== values.rmSecretKey) setSavedSecret(values.rmSecretKey);

  const hasSavedSecret = savedSecret.trim() !== '';
  const secretDraft = secretChanged ? values.rmSecretKey : '';

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup
        title={t('settings.groups.client_keys.title')}
        description={t('settings.groups.client_keys.description')}
      >
        <SettingRow
          fieldId="apiKeys"
          layout="stacked"
          label={apiKeysText.label}
          description={apiKeysText.description}
          changed={changedFieldIds.has('apiKeys')}
        >
          <ApiKeysEditor
            value={values.apiKeysText}
            disabled={disabled}
            onChange={(apiKeysText) => onChange({ apiKeysText })}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.management.title')}
        description={t('settings.groups.management.description')}
      >
        <SwitchSetting fieldId="rmAllowRemote" />
        <SettingRow
          fieldId="rmSecretKey"
          label={secretText.label}
          description={secretText.description}
          changed={secretChanged}
        >
          <SensitiveInput
            className="w-full font-mono"
            aria-label={t('settings.access.new_management_key')}
            placeholder={t('settings.access.new_management_key')}
            autoComplete="new-password"
            value={secretDraft}
            disabled={disabled}
            onValueChange={(next: string) =>
              onChange({ rmSecretKey: next === '' ? savedSecret : next })
            }
          />
        </SettingRow>
        <SettingNote
          title={
            hasSavedSecret
              ? t('settings.access.management_key_set_title')
              : t('settings.access.management_key_unset_title')
          }
          description={
            hasSavedSecret
              ? t('settings.access.management_key_set_description')
              : t('settings.access.management_key_unset_description')
          }
        />
        <SwitchSetting fieldId="rmDisableControlPanel" />
        <SwitchSetting fieldId="rmDisableAutoUpdatePanel" />
        <TextSetting
          fieldId="rmPanelRepo"
          placeholder="https://github.com/router-for-me/Cli-Proxy-API-Management-Center"
        />
      </SettingsGroup>
    </div>
  );
}
