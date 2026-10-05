import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LinkButton, Select } from '@cloudflare/kumo';
import { ArrowRightIcon } from '@phosphor-icons/react';
import type { RoutingStrategy } from '@/types/visualConfig';
import { LiveRoutingFlow } from '@/features/routing/components/LiveRoutingFlow';
import { SettingNote } from '../components/SettingNote';
import { SettingRow } from '../components/SettingRow';
import { SettingsGroup } from '../components/SettingsGroup';
import { SwitchSetting, TextSetting } from '../components/controls';
import { ROUTING_STRATEGIES } from '../settingsLayout';
import { useFieldText, useSettingsForm } from '../settingsForm';

const STRATEGY_KEYS: Record<RoutingStrategy, string> = {
  'round-robin': 'round_robin',
  'weighted-round-robin': 'weighted',
  'fill-first': 'fill_first',
};

export function RoutingSection() {
  const { t } = useTranslation();
  const { values, disabled, changedFieldIds, onChange } = useSettingsForm();
  const strategyText = useFieldText()('routingStrategy');
  const strategyName = (strategy: RoutingStrategy) =>
    t(`settings.routing.strategies.${STRATEGY_KEYS[strategy]}.label`);
  const strategyDescription = (strategy: RoutingStrategy) =>
    t(`settings.routing.strategies.${STRATEGY_KEYS[strategy]}.description`);

  const flowSettings = useMemo(
    () => ({
      strategy: values.routingStrategy,
      sessionAffinity: values.routingSessionAffinity,
      affinityTTL: values.routingSessionAffinityTTL.trim(),
      subagentsShare: values.routingSessionAffinitySubagents,
    }),
    [
      values.routingSessionAffinity,
      values.routingSessionAffinitySubagents,
      values.routingSessionAffinityTTL,
      values.routingStrategy,
    ]
  );

  return (
    <div className="flex flex-col gap-6">
      <LiveRoutingFlow
        compact
        title={t('routing.flow.title')}
        description={t('settings.routing.flow_description')}
        settings={flowSettings}
        actions={
          <LinkButton variant="secondary" size="sm" href="/routing">
            {t('settings.routing.reset_aware_link')}
            <ArrowRightIcon aria-hidden="true" />
          </LinkButton>
        }
      />

      <SettingsGroup
        title={t('settings.groups.selection.title')}
        description={t('settings.groups.selection.description')}
      >
        <SettingRow
          fieldId="routingStrategy"
          label={strategyText.label}
          description={strategyDescription(values.routingStrategy)}
          changed={changedFieldIds.has('routingStrategy')}
        >
          <Select
            className="w-full"
            aria-label={strategyText.label}
            value={values.routingStrategy}
            disabled={disabled}
            renderValue={(value: RoutingStrategy) => strategyName(value)}
            items={ROUTING_STRATEGIES.map((strategy) => ({
              value: strategy,
              label: (
                <span className="flex flex-col gap-0.5 py-0.5">
                  <span className="text-kumo-default">{strategyName(strategy)}</span>
                  <span className="text-xs text-kumo-subtle">{strategyDescription(strategy)}</span>
                </span>
              ),
            }))}
            onValueChange={(next: RoutingStrategy | null) => {
              if (next) onChange({ routingStrategy: next });
            }}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.affinity.title')}
        description={t('settings.groups.affinity.description')}
      >
        <SwitchSetting fieldId="routingSessionAffinity" />
        <TextSetting fieldId="routingSessionAffinityTTL" placeholder="1h" mono />
        <SwitchSetting fieldId="routingSessionAffinitySubagents" />
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.retries.title')}
        description={t('settings.groups.retries.description')}
      >
        <TextSetting fieldId="requestRetry" type="number" placeholder="3" />
        <TextSetting fieldId="maxRetryInterval" type="number" placeholder="30" />
        <TextSetting fieldId="maxRetryCredentials" type="number" placeholder="0" />
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.cooldowns.title')}
        description={t('settings.groups.cooldowns.description')}
      >
        <SwitchSetting fieldId="disableCooling" />
        <TextSetting fieldId="transientErrorCooldownSeconds" type="number" placeholder="60" />
        <SwitchSetting fieldId="saveCooldownStatus" />
        <SettingNote
          title={t('settings.routing.model_cooling_title')}
          description={t('settings.routing.model_cooling_description')}
        />
        <SwitchSetting fieldId="claudeModelLevelCooling" />
        <SwitchSetting fieldId="codexModelLevelCooling" />
      </SettingsGroup>
    </div>
  );
}
