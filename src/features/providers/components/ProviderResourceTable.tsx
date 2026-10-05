import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconAlertTriangle,
  IconCheckCircle2,
  IconEye,
  IconPencil,
  IconTrash2,
} from '@/components/ui/icons';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/Table';
import { Badge } from '@cloudflare/kumo';
import { Button } from '@/components/ui/Button';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { ProviderStatusBar } from '@/components/providers/ProviderStatusBar';
import {
  getOpenAIProviderRecentStatusData,
  getOpenAIProviderTotalStats,
  getProviderRecentStatusData,
  getProviderTotalStats,
  getProviderUsageKey,
  type ProviderRecentUsageMap,
} from '@/components/providers/utils';
import type { OpenAIProviderConfig } from '@/types';
import type { StatusBarData } from '@/utils/recentRequests';
import type { ProviderResource } from '../types';
import { isMultiProtocolSponsorBrand } from '../sponsorDefinitions';
import statusBarStyles from './providerStatusBar.module.scss';

interface ProviderResourceTableProps {
  resources: ProviderResource[];
  selectedId?: string | null;
  disableMutations?: boolean;
  usageByProvider?: ProviderRecentUsageMap;
  onView: (resource: ProviderResource) => void;
  onEdit: (resource: ProviderResource) => void;
  onDelete: (resource: ProviderResource) => void;
  onToggleDisabled?: (resource: ProviderResource, disabled: boolean) => void;
}

const BASE_URL_CLASS = 'block w-full min-w-0 truncate font-mono text-xs text-kumo-subtle';
const STICKY_HEAD_CLASS =
  'sticky right-0 z-3 w-44 min-w-44 !bg-kumo-elevated shadow-[-12px_0_16px_-18px_var(--color-kumo-shadow-drop)]';
const STICKY_CELL_CLASS =
  'sticky right-0 z-2 w-44 min-w-44 bg-(--kumo-table-row-bg) shadow-[-12px_0_16px_-18px_var(--color-kumo-shadow-drop)]';

const columnWidths = ['180px', '220px', '72px', '138px', '174px', '176px'];

const isSponsorResource = (resource: ProviderResource): boolean =>
  isMultiProtocolSponsorBrand(resource.brand);

const resolveStatusBarData = (
  resource: ProviderResource,
  usageByProvider: ProviderRecentUsageMap
): StatusBarData => {
  if (resource.brand === 'openaiCompatibility') {
    return getOpenAIProviderRecentStatusData(resource.raw as OpenAIProviderConfig, usageByProvider);
  }
  return getProviderRecentStatusData(
    usageByProvider,
    getProviderUsageKey(resource.brand),
    resource.apiKey ?? undefined,
    resource.baseUrl ?? undefined
  );
};

const resolveTotalStats = (
  resource: ProviderResource,
  usageByProvider: ProviderRecentUsageMap
): { success: number; failure: number } => {
  if (resource.brand === 'openaiCompatibility') {
    return getOpenAIProviderTotalStats(resource.raw as OpenAIProviderConfig, usageByProvider);
  }
  return getProviderTotalStats(
    usageByProvider,
    getProviderUsageKey(resource.brand),
    resource.apiKey ?? undefined,
    resource.baseUrl ?? undefined
  );
};

export function ProviderResourceTable({
  resources,
  selectedId,
  disableMutations,
  usageByProvider,
  onView,
  onEdit,
  onDelete,
  onToggleDisabled,
}: ProviderResourceTableProps) {
  const { t } = useTranslation();

  const renderMetric = (key: string, label: string, value: number) => (
    <Badge key={key} variant="secondary">
      <span className="text-kumo-subtle">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </Badge>
  );

  const renderFlagTag = (key: string, label: string) => (
    <Badge key={key} variant="info">
      {label}
    </Badge>
  );

  const renderProtocolSummary = (r: ProviderResource) =>
    (r.flags.protocols ?? [])
      .map((protocol) => t(`providersPage.sponsor.protocols.${protocol}`))
      .join(' / ');

  const renderModelsSummary = (r: ProviderResource) => {
    const items: ReactNode[] = [];
    if (isSponsorResource(r)) {
      (r.flags.protocols ?? []).forEach((protocol) => {
        items.push(renderFlagTag(protocol, t(`providersPage.sponsor.protocols.${protocol}`)));
      });
      return <div className="flex flex-wrap items-center gap-1.5">{items}</div>;
    }
    if (r.brand === 'openaiCompatibility') {
      items.push(
        renderMetric('models', t('providersPage.table.metrics.models'), r.modelCount),
        renderMetric('keys', t('providersPage.table.metrics.keys'), r.apiKeyEntryCount),
        renderMetric('headers', t('providersPage.table.metrics.headers'), r.headerCount)
      );
    } else {
      items.push(
        renderMetric('models', t('providersPage.table.metrics.models'), r.modelCount),
        renderMetric('headers', t('providersPage.table.metrics.headers'), r.headerCount)
      );
      if ((r.brand === 'codex' || r.brand === 'xai') && r.flags.websockets) {
        items.push(renderFlagTag('ws', t('providersPage.table.websocketsTag')));
      }
      if (r.brand === 'claude' && r.flags.cloakEnabled) {
        items.push(renderFlagTag('cloak', t('providersPage.table.cloakTag')));
      }
      if (r.brand === 'claude' && r.flags.claudeCodeCliProfile) {
        items.push(renderFlagTag('cli-profile', t('providersPage.table.cliProfileTag')));
      }
    }
    return <div className="flex flex-wrap items-center gap-1.5">{items}</div>;
  };

  const renderStatus = (r: ProviderResource) =>
    r.disabled ? (
      <Badge variant="warning">
        <IconAlertTriangle size={12} />
        {t('providersPage.status.disabled')}
      </Badge>
    ) : (
      <Badge variant="success">
        <IconCheckCircle2 size={12} />
        {t('providersPage.status.active')}
      </Badge>
    );

  const renderPrimary = (r: ProviderResource) => {
    if (isSponsorResource(r)) {
      return (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="max-w-56 truncate font-medium text-kumo-default">{r.name ?? r.identifier}</span>
          <span className="max-w-56 truncate font-mono text-xs text-kumo-subtle">
            {r.apiKeyPreview ?? t('providersPage.status.notConfigured')}
          </span>
        </div>
      );
    }
    if (r.brand === 'openaiCompatibility') {
      const extra = r.apiKeyEntryCount > 1 ? ` · +${r.apiKeyEntryCount - 1}` : '';
      return (
        <div className="flex min-w-0 flex-col gap-1">
          <span className="max-w-56 truncate font-medium text-kumo-default">{r.name ?? r.identifier}</span>
          <span className="max-w-56 truncate font-mono text-xs text-kumo-subtle">{(r.apiKeyPreview ?? '—') + extra}</span>
        </div>
      );
    }
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <span className="max-w-56 truncate font-medium text-kumo-default">{r.apiKeyPreview ?? '—'}</span>
        {r.authIndex ? <span className="max-w-56 truncate font-mono text-xs text-kumo-subtle">auth: {r.authIndex}</span> : null}
      </div>
    );
  };

  const renderBaseUrl = (r: ProviderResource) => {
    if (isSponsorResource(r)) {
      return <span className={BASE_URL_CLASS}>{renderProtocolSummary(r)}</span>;
    }
    if (r.brand === 'claude' && !r.baseUrl) {
      return (
        <span className={BASE_URL_CLASS}>
          https://api.anthropic.com {t('providersPage.status.defaultSuffix')}
        </span>
      );
    }
    return <span className={BASE_URL_CLASS}>{r.baseUrl ?? t('providersPage.status.notSet')}</span>;
  };

  return (
    <Table
      className="min-w-[960px] table-fixed"
      cols={columnWidths.map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    >
      <TableHeader>
        <TableRow>
          <TableHead>{t('providersPage.table.key')}</TableHead>
          <TableHead>{t('providersPage.table.baseUrl')}</TableHead>
          <TableHead>{t('providersPage.table.prefix')}</TableHead>
          <TableHead>{t('providersPage.table.models')}</TableHead>
          <TableHead>{t('providersPage.table.status')}</TableHead>
          <TableHead alignRight className={STICKY_HEAD_CLASS}>
            {t('providersPage.table.actions')}
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {resources.map((resource) => {
          return (
            <TableRow key={resource.id} selected={resource.id === selectedId}>
              <TableCell>{renderPrimary(resource)}</TableCell>
              <TableCell>{renderBaseUrl(resource)}</TableCell>
              <TableCell>
                {resource.prefix ? (
                  <Badge variant="outline">{resource.prefix}</Badge>
                ) : (
                  <span className={BASE_URL_CLASS}>{t('providersPage.status.none')}</span>
                )}
              </TableCell>
              <TableCell>{renderModelsSummary(resource)}</TableCell>
              <TableCell>
                <div className="flex max-w-48 min-w-0 flex-col items-start gap-1.5">
                  {renderStatus(resource)}
                  {usageByProvider && !isSponsorResource(resource) ? (
                    <>
                      {(() => {
                        const stats = resolveTotalStats(resource, usageByProvider);
                        return (
                          <div className="flex max-w-full flex-wrap gap-1">
                            <Badge variant="success" className="tabular-nums">
                              {t('stats.success')}: {stats.success}
                            </Badge>
                            <Badge variant="error" className="tabular-nums">
                              {t('stats.failure')}: {stats.failure}
                            </Badge>
                          </div>
                        );
                      })()}
                      <div className="w-[min(100%,178px)] min-w-0">
                        <ProviderStatusBar
                          statusData={resolveStatusBarData(resource, usageByProvider)}
                          styles={statusBarStyles}
                        />
                      </div>
                    </>
                  ) : null}
                </div>
              </TableCell>
              <TableCell
                alignRight
                className={STICKY_CELL_CLASS}
              >
                <div className="flex min-w-0 items-center justify-end gap-1">
                  {onToggleDisabled ? (
                    <span className="mr-1 inline-flex items-center" onClick={(e) => e.stopPropagation()}>
                      <ToggleSwitch
                        checked={!resource.disabled}
                        disabled={disableMutations}
                        onChange={(value) => onToggleDisabled(resource, !value)}
                        ariaLabel={
                          resource.disabled
                            ? t('providersPage.actions.enable')
                            : t('providersPage.actions.disable')
                        }
                      />
                    </span>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('providersPage.actions.view')}
                    title={t('providersPage.actions.view')}
                    onClick={(e) => {
                      e.stopPropagation();
                      onView(resource);
                    }}
                  >
                    <IconEye size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={t('providersPage.actions.edit')}
                    title={t('providersPage.actions.edit')}
                    disabled={disableMutations}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(resource);
                    }}
                  >
                    <IconPencil size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="!text-kumo-danger hover:!bg-kumo-danger-tint"
                    aria-label={t('providersPage.actions.delete')}
                    title={t('providersPage.actions.delete')}
                    disabled={disableMutations}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(resource);
                    }}
                  >
                    <IconTrash2 size={16} />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
