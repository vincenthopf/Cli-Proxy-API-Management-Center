import { useTranslation } from 'react-i18next';
import { Button, Input } from '@cloudflare/kumo';
import { FileCodeIcon } from '@phosphor-icons/react';
import { getValidationMessage } from '@/features/config/components/blocks/shared';
import { SettingNote } from '../components/SettingNote';
import { SettingRow } from '../components/SettingRow';
import { SettingsDisclosure, SettingsGroup } from '../components/SettingsGroup';
import { ListSetting, SwitchSetting, TextSetting } from '../components/controls';
import { useFieldText, useSettingsForm } from '../settingsForm';

const TLS_FIELDS = ['tlsEnable', 'tlsCert', 'tlsKey'] as const;
const DISCOVERY_FIELDS = [
  'discoveryEnabled',
  'discoveryServiceName',
  'discoveryServiceType',
  'discoverySubtypes',
  'discoveryInterfacesInclude',
  'discoveryInterfacesExclude',
  'discoveryAuthRequired',
  'discoveryAdvertiseManagement',
] as const;

export function NetworkSection({ onOpenYaml }: { onOpenYaml: () => void }) {
  const { t } = useTranslation();
  const { values, validationErrors } = useSettingsForm();
  const fieldText = useFieldText();
  const hostText = fieldText('host');
  const portText = fieldText('port');
  const portError = getValidationMessage(t, validationErrors.port);

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup
        title={t('settings.groups.upstream.title')}
        description={t('settings.groups.upstream.description')}
      >
        <TextSetting
          fieldId="proxyUrl"
          placeholder="socks5://user:pass@127.0.0.1:1080/"
          layout="stacked"
          mono
        />
        <SwitchSetting fieldId="passthroughHeaders" />
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.listener.title')}
        description={t('settings.groups.listener.description')}
      >
        <SettingRow fieldId="host" label={hostText.label} description={hostText.description}>
          <Input
            className="w-full font-mono"
            aria-label={hostText.label}
            readOnly
            value={values.host || t('settings.network.all_interfaces')}
          />
        </SettingRow>
        <SettingRow
          fieldId="port"
          label={portText.label}
          description={portText.description}
          error={portError}
        >
          <Input
            className="w-full font-mono"
            aria-label={portText.label}
            readOnly
            value={values.port || t('settings.network.default_port')}
          />
        </SettingRow>
        <SettingNote
          title={t('settings.network.listener_note_title')}
          description={t('settings.network.listener_note_description')}
          action={
            <Button variant="secondary" size="sm" icon={<FileCodeIcon />} onClick={onOpenYaml}>
              {t('settings.network.open_yaml')}
            </Button>
          }
        />
        <ListSetting fieldId="trustedProxies" placeholder="192.168.0.0/24" />
        <SettingsDisclosure
          title={t('settings.groups.tls.title')}
          description={t('settings.groups.tls.description')}
          fieldIds={TLS_FIELDS}
        >
          <SwitchSetting fieldId="tlsEnable" />
          <TextSetting fieldId="tlsCert" placeholder="/path/to/cert.pem" mono />
          <TextSetting fieldId="tlsKey" placeholder="/path/to/key.pem" mono />
        </SettingsDisclosure>
        <SettingsDisclosure
          title={t('config_management.visual.serverExtras.discoveryTitle')}
          description={t('config_management.visual.serverExtras.discoveryHint')}
          fieldIds={DISCOVERY_FIELDS}
        >
          <SwitchSetting fieldId="discoveryEnabled" />
          <TextSetting fieldId="discoveryServiceName" placeholder="CPA" />
          <TextSetting fieldId="discoveryServiceType" placeholder="_ai-gateway._tcp" mono />
          <ListSetting fieldId="discoverySubtypes" placeholder="_responses" />
          <ListSetting fieldId="discoveryInterfacesInclude" placeholder="en*" />
          <ListSetting fieldId="discoveryInterfacesExclude" placeholder="docker*" />
          <SwitchSetting fieldId="discoveryAuthRequired" />
          <SwitchSetting fieldId="discoveryAdvertiseManagement" />
        </SettingsDisclosure>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.streaming.title')}
        description={t('settings.groups.streaming.description')}
      >
        <TextSetting
          fieldId="streamingKeepaliveSeconds"
          type="number"
          placeholder="0"
          showOffWhenNonPositive
        />
        <TextSetting fieldId="streamingBootstrapRetries" type="number" placeholder="1" />
        <TextSetting
          fieldId="streamingNonstreamKeepalive"
          type="number"
          placeholder="0"
          showOffWhenNonPositive
        />
      </SettingsGroup>
    </div>
  );
}
