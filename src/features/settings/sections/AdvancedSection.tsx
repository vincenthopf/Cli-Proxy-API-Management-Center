import { useTranslation } from 'react-i18next';
import { Button, Text } from '@cloudflare/kumo';
import { FileCodeIcon } from '@phosphor-icons/react';
import { PluginStoreAuthEditor } from '@/features/config/components/blocks/PluginStoreAuthEditor';
import { FIELDS_ROOT_CLASS } from '@/features/config/components/fields/FieldPrimitives';
import { SettingRow } from '../components/SettingRow';
import { SettingsGroup } from '../components/SettingsGroup';
import { ListSetting, SwitchSetting, TextSetting } from '../components/controls';
import { useFieldText, useSettingsForm } from '../settingsForm';

export function AdvancedSection({ onOpenYaml }: { onOpenYaml: () => void }) {
  const { t } = useTranslation();
  const { values, disabled, changedFieldIds, onChange } = useSettingsForm();
  const storeAuthText = useFieldText()('pluginStoreAuth');

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup
        title={t('settings.groups.server.title')}
        description={t('settings.groups.server.description')}
      >
        <SwitchSetting fieldId="commercialMode" />
        <TextSetting fieldId="authDir" placeholder="~/.cli-proxy-api" mono />
        <TextSetting fieldId="authAutoRefreshWorkers" type="number" placeholder="16" />
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.plugins.title')}
        description={t('settings.groups.plugins.description')}
      >
        <SwitchSetting fieldId="pluginsEnabled" />
        <ListSetting
          fieldId="pluginStoreSources"
          placeholder={t(
            'config_management.visual.sections.system.plugin_store_sources_placeholder'
          )}
        />
        <SettingRow
          fieldId="pluginStoreAuth"
          layout="stacked"
          label={storeAuthText.label}
          description={storeAuthText.description}
          tooltip={t('config_management.visual.sections.system.plugin_store_auth_hint')}
          changed={changedFieldIds.has('pluginStoreAuth')}
        >
          <div className={FIELDS_ROOT_CLASS}>
            <PluginStoreAuthEditor
              value={values.pluginStoreAuth}
              disabled={disabled}
              onChange={(pluginStoreAuth) => onChange({ pluginStoreAuth })}
            />
          </div>
        </SettingRow>
      </SettingsGroup>

      <div className="flex flex-col gap-3 rounded-lg bg-kumo-elevated p-5 ring ring-kumo-line sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Text variant="heading" as="h3">
            {t('settings.advanced.yaml_title')}
          </Text>
          <Text variant="secondary" size="sm">
            {t('settings.advanced.yaml_description')}
          </Text>
        </div>
        <Button variant="secondary" icon={<FileCodeIcon />} onClick={onOpenYaml}>
          {t('settings.advanced.yaml_open')}
        </Button>
      </div>
    </div>
  );
}
