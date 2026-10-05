import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Banner, Switch } from '@cloudflare/kumo';
import { WarningIcon } from '@phosphor-icons/react';
import { configApi } from '@/services/api';
import { useAuthStore, useConfigStore, useNotificationStore } from '@/stores';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { SettingRow } from '../components/SettingRow';
import { SettingsGroup } from '../components/SettingsGroup';
import { SwitchSetting, TextSetting } from '../components/controls';

export function LoggingSection({ onServerConfigChanged }: { onServerConfigChanged: () => void }) {
  const { t } = useTranslation();
  const requestLog = useConfigStore((state) => state.config?.requestLog);
  const updateConfigValue = useConfigStore((state) => state.updateConfigValue);
  const clearCache = useConfigStore((state) => state.clearCache);
  const connected = useAuthStore((state) => state.connectionStatus === 'connected');
  const showNotification = useNotificationStore((state) => state.showNotification);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const enabled = requestLog === true;

  const apply = async (next: boolean) => {
    const previous = enabled;
    setSaving(true);
    updateConfigValue('request-log', next);
    try {
      await configApi.updateRequestLog(next);
      clearCache('request-log');
      showNotification(t('notification.request_log_updated'), 'success');
      onServerConfigChanged();
    } catch (error: unknown) {
      updateConfigValue('request-log', previous);
      const message = error instanceof Error ? error.message : '';
      showNotification(
        `${t('notification.update_failed')}${message ? `: ${message}` : ''}`,
        'error'
      );
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <SettingsGroup
        title={t('settings.groups.logs.title')}
        description={t('settings.groups.logs.description')}
      >
        <SwitchSetting fieldId="debug" />
        <SwitchSetting fieldId="loggingToFile" />
        <TextSetting fieldId="logsMaxTotalSizeMb" type="number" min={0} placeholder="0" />
        <TextSetting fieldId="errorLogsMaxFiles" type="number" min={0} placeholder="10" />
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.request_log.title')}
        description={t('settings.groups.request_log.description')}
      >
        <div className="py-4">
          <Banner
            variant="alert"
            icon={<WarningIcon weight="fill" />}
            title={t('settings.logging.request_log_warning_title')}
            description={t('settings.logging.request_log_warning_description')}
          />
        </div>
        <SettingRow
          fieldId="requestLog"
          layout="switch"
          label={t('settings.logging.request_log_label')}
          description={t('settings.logging.request_log_description')}
        >
          <Switch
            aria-label={t('settings.logging.request_log_label')}
            checked={enabled}
            transitioning={saving}
            disabled={!connected || saving || requestLog === undefined}
            onCheckedChange={(checked) => {
              if (checked) setConfirmOpen(true);
              else void apply(false);
            }}
          />
        </SettingRow>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.groups.usage.title')}
        description={t('settings.groups.usage.description')}
      >
        <SwitchSetting fieldId="usageStatisticsEnabled" />
        <TextSetting
          fieldId="redisUsageQueueRetentionSeconds"
          type="number"
          min={1}
          max={3600}
          placeholder="60"
        />
      </SettingsGroup>

      <ConfirmDialog
        open={confirmOpen}
        title={t('settings.logging.request_log_confirm_title')}
        description={t('settings.logging.request_log_confirm_description')}
        confirmLabel={t('settings.logging.request_log_confirm')}
        cancelLabel={t('common.cancel')}
        busy={saving}
        onConfirm={() => void apply(true)}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
