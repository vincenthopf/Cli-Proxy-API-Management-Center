import { useTranslation } from 'react-i18next';
import { Link as RouterLink } from 'react-router-dom';
import { Banner, Select, Text } from '@cloudflare/kumo';
import { ArrowRightIcon, InfoIcon } from '@phosphor-icons/react';
import type { RoutingStrategy } from '@/types/visualConfig';
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

  return (
    <div className="flex flex-col gap-6">
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
        <div className="py-4">
          <Banner
            variant="default"
            icon={<InfoIcon weight="fill" />}
            title={t('settings.routing.model_cooling_title')}
            description={t('settings.routing.model_cooling_description')}
          />
        </div>
        <SwitchSetting fieldId="claudeModelLevelCooling" />
        <SwitchSetting fieldId="codexModelLevelCooling" />
      </SettingsGroup>

      <div className="flex flex-col gap-3 rounded-lg border border-kumo-line bg-kumo-base p-4 sm:flex-row md:p-5 sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <Text variant="heading" as="h3">
            {t('settings.routing.reset_aware_title')}
          </Text>
          <Text variant="secondary" size="sm">
            {t('settings.routing.reset_aware_description')}
          </Text>
        </div>
        <RouterLink
          to="/routing"
          className="inline-flex shrink-0 items-center gap-1.5 rounded text-sm font-medium text-kumo-link hover:underline focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none"
        >
          {t('settings.routing.reset_aware_link')}
          <ArrowRightIcon aria-hidden="true" />
        </RouterLink>
      </div>
    </div>
  );
}
