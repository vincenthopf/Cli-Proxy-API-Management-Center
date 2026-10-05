import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Text } from '@cloudflare/kumo';
import { ArrowRightIcon } from '@phosphor-icons/react';
import { useConfigStore } from '@/stores';
import { Panel } from '@/components/ui/Panel';
import {
  SETTINGS_SECTION_IDS,
  buildSettingsSummary,
  type SectionCounts,
  type SettingsSectionId,
} from '../settingsLayout';
import { useSettingsForm } from '../settingsForm';

const STRATEGY_KEYS = {
  'round-robin': 'round_robin',
  'weighted-round-robin': 'weighted',
  'fill-first': 'fill_first',
} as const;

function SummaryRow({
  label,
  value,
  actionLabel,
  onAction,
}: {
  label: string;
  value: ReactNode;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
      <Text variant="secondary" size="sm">
        <span className="block sm:w-44">{label}</span>
      </Text>
      <div className="min-w-0 flex-1 text-base text-kumo-default">{value}</div>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex shrink-0 items-center gap-1 self-start rounded text-sm font-medium text-kumo-link hover:underline focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none sm:self-center"
      >
        {actionLabel}
        <ArrowRightIcon aria-hidden="true" />
      </button>
    </div>
  );
}

export function OverviewSection({
  changedCounts,
  errorCounts,
  onOpen,
}: {
  changedCounts: SectionCounts;
  errorCounts: SectionCounts;
  onOpen: (section: SettingsSectionId, fieldId?: string) => void;
}) {
  const { t } = useTranslation();
  const { values, changedFieldIds } = useSettingsForm();
  const requestLog = useConfigStore((state) => state.config?.requestLog);
  const summary = buildSettingsSummary(values, requestLog);
  const onOff = (on: boolean) => (on ? t('settings.overview.on') : t('settings.overview.off'));
  const edit = t('settings.overview.edit');

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Text variant="heading" as="h3">
            {t('settings.overview.summary_title')}
          </Text>
          {changedFieldIds.size > 0 ? (
            <Badge variant="info">{t('settings.overview.includes_unsaved')}</Badge>
          ) : null}
        </div>
        <Panel padding="none" className="divide-y divide-kumo-line px-4 md:px-5">
          <SummaryRow
            label={t('settings.overview.listen_address')}
            value={
              <span className="font-mono">
                {summary.host || t('settings.network.all_interfaces')}
                {':'}
                {summary.port || t('settings.network.default_port')}
              </span>
            }
            actionLabel={edit}
            onAction={() => onOpen('network', 'host')}
          />
          <SummaryRow
            label={t('settings.overview.client_keys')}
            value={
              summary.clientKeyCount > 0
                ? t('settings.overview.client_keys_value', { count: summary.clientKeyCount })
                : t('settings.overview.client_keys_none')
            }
            actionLabel={edit}
            onAction={() => onOpen('access', 'apiKeys')}
          />
          <SummaryRow
            label={t('settings.overview.routing_strategy')}
            value={t(`settings.routing.strategies.${STRATEGY_KEYS[summary.routingStrategy]}.label`)}
            actionLabel={edit}
            onAction={() => onOpen('routing', 'routingStrategy')}
          />
          <SummaryRow
            label={t('settings.overview.session_affinity')}
            value={
              summary.sessionAffinity && summary.sessionAffinityTTL
                ? t('settings.overview.on_with_ttl', { ttl: summary.sessionAffinityTTL })
                : onOff(summary.sessionAffinity)
            }
            actionLabel={edit}
            onAction={() => onOpen('routing', 'routingSessionAffinity')}
          />
          <SummaryRow
            label={t('settings.overview.request_logging')}
            value={
              summary.requestLog === null ? (
                <Text variant="secondary">{t('settings.overview.unknown')}</Text>
              ) : summary.requestLog ? (
                <Badge variant="warning">{t('settings.overview.on')}</Badge>
              ) : (
                onOff(false)
              )
            }
            actionLabel={edit}
            onAction={() => onOpen('logging', 'requestLog')}
          />
        </Panel>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SETTINGS_SECTION_IDS.filter((id) => id !== 'overview').map((id) => {
          const changed = changedCounts[id] ?? 0;
          const errors = errorCounts[id] ?? 0;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onOpen(id)}
              className="flex flex-col gap-1 rounded-lg border border-kumo-line bg-kumo-base p-4 text-left transition-colors hover:bg-kumo-tint focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none"
            >
              <span className="flex items-center gap-2">
                <span className="text-base font-medium text-kumo-default">
                  {t(`settings.sections.${id}.title`)}
                </span>
                {errors > 0 ? (
                  <Badge variant="error">{t('settings.nav.errors', { count: errors })}</Badge>
                ) : changed > 0 ? (
                  <Badge variant="info">{t('settings.nav.changed', { count: changed })}</Badge>
                ) : null}
              </span>
              <span className="text-sm text-kumo-subtle">
                {t(`settings.sections.${id}.description`)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
