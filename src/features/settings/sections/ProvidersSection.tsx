import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from '@cloudflare/kumo';
import { getValidationMessage } from '@/features/config/components/blocks/shared';
import { CodexLiveICEServersEditor } from '@/features/config/components/blocks/CodexLiveICEServersEditor';
import { PayloadFilterRulesEditor } from '@/features/config/components/blocks/PayloadFilterRulesEditor';
import { PayloadRulesEditor } from '@/features/config/components/blocks/PayloadRulesEditor';
import { FIELDS_ROOT_CLASS } from '@/features/config/components/fields/FieldPrimitives';
import { configFieldDomId } from '@/features/config/searchIndex';
import type { PayloadFilterRule, PayloadRule } from '@/types/visualConfig';
import { SettingRow } from '../components/SettingRow';
import { SettingsDisclosure, SettingsGroup } from '../components/SettingsGroup';
import { ListSetting, SelectSetting, SwitchSetting, TextSetting } from '../components/controls';
import { useFieldText, useSettingsForm } from '../settingsForm';

const CLAUDE_HEADER_FIELDS = [
  'claudeHeaderUserAgent',
  'claudeHeaderPackageVersion',
  'claudeHeaderRuntimeVersion',
  'claudeHeaderOs',
  'claudeHeaderArch',
  'claudeHeaderTimeout',
  'claudeHeaderStabilizeDeviceProfile',
] as const;
const CODEX_HEADER_FIELDS = ['codexHeaderUserAgent', 'codexHeaderBetaFeatures'] as const;
const LIVE_RELAY_FIELDS = [
  'codexLiveMediaRelayEnabled',
  'codexLiveMediaRelayMaxSessions',
  'codexLiveMediaRelayDisablePrivateRemoteIPs',
  'codexLiveMediaRelayPublicIP',
  'codexLiveMediaRelayUDPPortMin',
  'codexLiveMediaRelayUDPPortMax',
  'codexLiveMediaRelayICEServers',
] as const;
const PAYLOAD_FIELDS = [
  'payloadDefaultRules',
  'payloadDefaultRawRules',
  'payloadOverrideRules',
  'payloadOverrideRawRules',
  'payloadFilterRules',
] as const;
const GEMINI_FIELDS = ['quotaSwitchProject', 'quotaSwitchPreviewModel'] as const;
const ANTIGRAVITY_FIELDS = [
  'quotaAntigravityCredits',
  'antigravityConnectionPoolEnabled',
  'antigravityConnectionPoolIdleTimeout',
  'antigravityConnectionPoolMaxIdleConnsPerHost',
  'antigravitySensitiveWords',
  'antigravitySignatureCacheEnabled',
  'antigravitySignatureBypassStrict',
] as const;
const OTHER_PROVIDER_FIELDS = [
  ...GEMINI_FIELDS,
  ...ANTIGRAVITY_FIELDS,
  'devinSensitiveWords',
  'xaiInjectXSearch',
  'wsAuth',
] as const;

function SubHeading({ children }: { children: ReactNode }) {
  return (
    <div className="pt-5 pb-1">
      <Text variant="heading" as="h4">
        {children}
      </Text>
    </div>
  );
}

function PayloadRow({
  fieldId,
  children,
}: {
  fieldId: (typeof PAYLOAD_FIELDS)[number];
  children: ReactNode;
}) {
  const { changedFieldIds } = useSettingsForm();
  const text = useFieldText()(fieldId);
  return (
    <SettingRow
      fieldId={fieldId}
      layout="stacked"
      label={text.label}
      description={text.description}
      changed={changedFieldIds.has(fieldId)}
    >
      <div className={FIELDS_ROOT_CLASS}>{children}</div>
    </SettingRow>
  );
}

export function ProvidersSection() {
  const { t } = useTranslation();
  const { values, disabled, validationErrors, hasPayloadValidationErrors, onChange } =
    useSettingsForm();
  const imageOptions = (['false', 'true', 'chat', 'passthrough'] as const).map((value) => ({
    value,
    label: t(`config_management.visual.sections.network.disable_image_generation_${value}`),
  }));

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup
        title={t('settings.groups.models.title')}
        description={t('settings.groups.models.description')}
      >
        <SwitchSetting fieldId="forceModelPrefix" />
        <SelectSetting fieldId="disableImageGeneration" options={imageOptions} />
        <TextSetting fieldId="gptImage2BaseModel" placeholder="gpt-5.4-mini" mono />
        <TextSetting fieldId="videoResultAuthCacheTTL" placeholder="3h" mono />
        <SettingsDisclosure
          key={hasPayloadValidationErrors ? 'payload-errors' : 'payload-ok'}
          title={t('settings.groups.payload.title')}
          description={t('settings.groups.payload.description')}
          fieldIds={PAYLOAD_FIELDS}
          defaultOpen={hasPayloadValidationErrors}
        >
          <PayloadRow fieldId="payloadDefaultRules">
            <PayloadRulesEditor
              value={values.payloadDefaultRules}
              disabled={disabled}
              onChange={(payloadDefaultRules: PayloadRule[]) => onChange({ payloadDefaultRules })}
            />
          </PayloadRow>
          <PayloadRow fieldId="payloadDefaultRawRules">
            <PayloadRulesEditor
              value={values.payloadDefaultRawRules}
              disabled={disabled}
              rawJsonValues
              onChange={(payloadDefaultRawRules: PayloadRule[]) =>
                onChange({ payloadDefaultRawRules })
              }
            />
          </PayloadRow>
          <PayloadRow fieldId="payloadOverrideRules">
            <PayloadRulesEditor
              value={values.payloadOverrideRules}
              disabled={disabled}
              protocolFirst
              onChange={(payloadOverrideRules: PayloadRule[]) => onChange({ payloadOverrideRules })}
            />
          </PayloadRow>
          <PayloadRow fieldId="payloadOverrideRawRules">
            <PayloadRulesEditor
              value={values.payloadOverrideRawRules}
              disabled={disabled}
              protocolFirst
              rawJsonValues
              onChange={(payloadOverrideRawRules: PayloadRule[]) =>
                onChange({ payloadOverrideRawRules })
              }
            />
          </PayloadRow>
          <PayloadRow fieldId="payloadFilterRules">
            <PayloadFilterRulesEditor
              value={values.payloadFilterRules}
              disabled={disabled}
              onChange={(payloadFilterRules: PayloadFilterRule[]) =>
                onChange({ payloadFilterRules })
              }
            />
          </PayloadRow>
        </SettingsDisclosure>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.claude.title')}
        description={t('settings.groups.claude.description')}
      >
        <SwitchSetting fieldId="claudeDisableCloakMode" />
        <SwitchSetting fieldId="claudeCodeDisableCloakingModelList" />
        <TextSetting fieldId="claudeHeaderTimezone" placeholder="Asia/Singapore" mono />
        <SettingsDisclosure
          title={t('settings.groups.claude_headers.title')}
          description={t('settings.groups.claude_headers.description')}
          fieldIds={CLAUDE_HEADER_FIELDS}
        >
          <TextSetting
            fieldId="claudeHeaderUserAgent"
            placeholder="claude-cli/2.1.44 (external, sdk-cli)"
            mono
          />
          <TextSetting fieldId="claudeHeaderPackageVersion" placeholder="0.74.0" mono />
          <TextSetting fieldId="claudeHeaderRuntimeVersion" placeholder="v24.3.0" mono />
          <TextSetting fieldId="claudeHeaderOs" placeholder="MacOS" mono />
          <TextSetting fieldId="claudeHeaderArch" placeholder="arm64" mono />
          <TextSetting fieldId="claudeHeaderTimeout" placeholder="600" mono />
          <SwitchSetting fieldId="claudeHeaderStabilizeDeviceProfile" />
        </SettingsDisclosure>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.codex.title')}
        description={t('settings.groups.codex.description')}
      >
        <SwitchSetting fieldId="codexDisableCloaking" />
        <SwitchSetting fieldId="codexStreamBootstrapBuffering" />
        <TextSetting fieldId="codexStreamBootstrapTimeout" placeholder="20s" mono />
        <SwitchSetting fieldId="codexOptimizeMultiAgentV2" />
        <SwitchSetting fieldId="codexOrphanDelegationCompatibility" />
        <SwitchSetting fieldId="codexResponseSteering" />
        <SettingsDisclosure
          title={t('settings.groups.codex_headers.title')}
          description={t('settings.groups.codex_headers.description')}
          fieldIds={CODEX_HEADER_FIELDS}
        >
          <TextSetting
            fieldId="codexHeaderUserAgent"
            placeholder="codex_cli_rs/0.114.0 (Mac OS 14.2.0; x86_64) vscode/1.111.0"
            layout="stacked"
            mono
          />
          <TextSetting fieldId="codexHeaderBetaFeatures" placeholder="multi_agent" mono />
        </SettingsDisclosure>
        <SettingsDisclosure
          title={t('config_management.visual.additions.liveRelayTitle')}
          description={t('config_management.visual.additions.liveRelayHint')}
          fieldIds={LIVE_RELAY_FIELDS}
        >
          <SwitchSetting fieldId="codexLiveMediaRelayEnabled" />
          <TextSetting fieldId="codexLiveMediaRelayMaxSessions" type="number" placeholder="32" />
          <SwitchSetting fieldId="codexLiveMediaRelayDisablePrivateRemoteIPs" />
          <TextSetting fieldId="codexLiveMediaRelayPublicIP" placeholder="203.0.113.10" mono />
          <TextSetting fieldId="codexLiveMediaRelayUDPPortMin" type="number" placeholder="0" />
          <TextSetting fieldId="codexLiveMediaRelayUDPPortMax" type="number" placeholder="0" />
          <div
            id={configFieldDomId('codexLiveMediaRelayICEServers')}
            className={`${FIELDS_ROOT_CLASS} scroll-mt-24 py-4`}
          >
            <CodexLiveICEServersEditor
              value={values.codexLiveMediaRelayICEServers}
              disabled={disabled}
              error={getValidationMessage(t, validationErrors.codexLiveMediaRelayICEServers)}
              onChange={(codexLiveMediaRelayICEServers) =>
                onChange({ codexLiveMediaRelayICEServers })
              }
            />
          </div>
        </SettingsDisclosure>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.other_providers.title')}
        description={t('settings.groups.other_providers.description')}
      >
        <SettingsDisclosure
          title={t('settings.groups.other_providers.toggle')}
          description={t('settings.groups.other_providers.toggle_description')}
          fieldIds={OTHER_PROVIDER_FIELDS}
        >
          <SubHeading>{t('settings.groups.gemini.title')}</SubHeading>
          <SwitchSetting fieldId="quotaSwitchProject" />
          <SwitchSetting fieldId="quotaSwitchPreviewModel" />
          <SubHeading>{t('config_management.visual.additions.antigravityTitle')}</SubHeading>
          <SwitchSetting fieldId="quotaAntigravityCredits" />
          <SwitchSetting fieldId="antigravityConnectionPoolEnabled" />
          <TextSetting fieldId="antigravityConnectionPoolIdleTimeout" placeholder="30s" mono />
          <TextSetting
            fieldId="antigravityConnectionPoolMaxIdleConnsPerHost"
            type="number"
            placeholder="2"
          />
          <ListSetting
            fieldId="antigravitySensitiveWords"
            placeholder={t(
              'config_management.visual.sections.system.antigravity_sensitive_words_placeholder'
            )}
          />
          <SwitchSetting fieldId="antigravitySignatureCacheEnabled" />
          <SwitchSetting fieldId="antigravitySignatureBypassStrict" />
          <SubHeading>{t('config_management.visual.sections.advanced.devin_title')}</SubHeading>
          <ListSetting
            fieldId="devinSensitiveWords"
            placeholder={t(
              'config_management.visual.sections.system.devin_sensitive_words_placeholder'
            )}
          />
          <SubHeading>{t('config_management.visual.additions.xaiTitle')}</SubHeading>
          <SwitchSetting fieldId="xaiInjectXSearch" />
          <SubHeading>{t('settings.groups.aistudio.title')}</SubHeading>
          <SwitchSetting fieldId="wsAuth" />
        </SettingsDisclosure>
      </SettingsGroup>
    </div>
  );
}
