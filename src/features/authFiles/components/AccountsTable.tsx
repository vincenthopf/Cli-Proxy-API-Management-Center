import type { MouseEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, DropdownMenu, Switch, Table, type BadgeVariant } from '@cloudflare/kumo';
import {
  ArrowClockwiseIcon,
  CubeIcon,
  DotsThreeIcon,
  DownloadSimpleIcon,
  InfoIcon,
  SnowflakeIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import type { AuthFileItem, ResolvedTheme } from '@/types';
import type { UsageResponse } from '@/services/api/sidecar';
import { resolveCodexPlanType } from '@/utils/quota';
import { formatCount, formatDuration, formatTokens } from '@/features/overview/format';
import { QuotaBars } from '@/features/overview/components/QuotaBars';
import {
  getAuthFileIcon,
  getTypeLabel,
  isRuntimeOnlyAuthFile,
  normalizeProviderKey,
  supportsAuthFileManualRefresh,
} from '@/features/authFiles/constants';
import { deriveAuthFileIdentity } from '@/features/authFiles/identity';
import { getAuthFileRefreshKey } from '@/features/authFiles/manualRefresh';
import {
  accountRowStatus,
  authIndexOf,
  hourlyTokens,
  matchSidecarAccount,
  usageGroupFor,
  type AccountRowStatus,
  type SidecarAccountIndex,
} from '@/features/authFiles/accountRows';
import { UsageSparkline } from './UsageSparkline';

const STATUS_BADGE: Record<AccountRowStatus['kind'], BadgeVariant> = {
  serving: 'success',
  standby: 'neutral',
  ready: 'neutral',
  paused: 'neutral',
  cooling: 'warning',
  exhausted: 'error',
  error: 'error',
};

const stop = (event: MouseEvent) => event.stopPropagation();

const titleCase = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

export interface AccountsTableProps {
  files: AuthFileItem[];
  selected: Set<string>;
  sidecarIndex: SidecarAccountIndex;
  usage: UsageResponse | null;
  now: number;
  resolvedTheme: ResolvedTheme;
  disableControls: boolean;
  deleting: string | null;
  statusUpdating: Record<string, boolean>;
  manualRefreshing: Record<string, boolean>;
  cooldownResetting: Record<string, boolean>;
  onToggleSelect: (name: string) => void;
  onSelectPage: () => void;
  onDeselectAll: () => void;
  onOpenDetails: (file: AuthFileItem) => void;
  onToggleStatus: (file: AuthFileItem, enabled: boolean) => void;
  onManualRefresh: (file: AuthFileItem) => void;
  onShowModels: (file: AuthFileItem) => void;
  onDownload: (name: string) => void;
  onDelete: (name: string) => void;
  onCooldownReset: (file: AuthFileItem) => void;
}

export function AccountsTable(props: AccountsTableProps) {
  const { t } = useTranslation();
  const {
    files,
    selected,
    sidecarIndex,
    usage,
    now,
    resolvedTheme,
    disableControls,
    deleting,
    statusUpdating,
    manualRefreshing,
    cooldownResetting,
    onToggleSelect,
    onSelectPage,
    onDeselectAll,
    onOpenDetails,
    onToggleStatus,
    onManualRefresh,
    onShowModels,
    onDownload,
    onDelete,
    onCooldownReset,
  } = props;

  const selectable = files.filter((file) => !isRuntimeOnlyAuthFile(file));
  const selectedOnPage = selectable.filter((file) => selected.has(file.name)).length;
  const allSelected = selectable.length > 0 && selectedOnPage === selectable.length;

  const statusLabel = (status: AccountRowStatus) => {
    if (status.kind === 'cooling') {
      return status.remainingMs && status.remainingMs > 0
        ? t('accounts.status_cooling_for', { time: formatDuration(status.remainingMs) })
        : t('accounts.status_cooling');
    }
    return t(`accounts.status_${status.kind}`);
  };

  return (
    <div className="overflow-x-auto">
      <Table>
        <Table.Header>
          <Table.Row>
            <Table.CheckHead
              checked={allSelected}
              indeterminate={selectedOnPage > 0 && !allSelected}
              disabled={selectable.length === 0}
              onCheckedChange={(checked) => (checked ? onSelectPage() : onDeselectAll())}
              aria-label={t('accounts.select_all')}
            />
            <Table.Head>{t('accounts.col_account')}</Table.Head>
            <Table.Head>{t('accounts.col_status')}</Table.Head>
            <Table.Head>{t('accounts.col_quota')}</Table.Head>
            <Table.Head>{t('accounts.col_usage')}</Table.Head>
            <Table.Head>{t('accounts.col_order')}</Table.Head>
            <Table.Head>
              <span className="sr-only">{t('accounts.col_actions')}</span>
            </Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {files.map((file) => {
            const runtimeOnly = isRuntimeOnlyAuthFile(file);
            const providerKey = normalizeProviderKey(String(file.type ?? file.provider ?? ''));
            const identity = deriveAuthFileIdentity(file);
            const account = matchSidecarAccount(file, sidecarIndex);
            const status = accountRowStatus(file, account, now);
            const key = account?.auth_index ?? authIndexOf(file);
            const group = usageGroupFor(usage, key);
            const tokens = hourlyTokens(usage, key);
            const requests = group?.requests ?? account?.requests_24h ?? null;
            const tokenTotal = tokens.reduce((sum, value) => sum + value, 0);
            const label = account?.label?.trim() || '';
            const primary =
              (typeof file.email === 'string' && file.email) || label || identity.primary;
            const plan = resolveCodexPlanType(file);
            const planLabel = plan
              ? t(`codex_quota.plan_${plan}`, { defaultValue: titleCase(plan) })
              : null;
            const icon = getAuthFileIcon(providerKey, resolvedTheme);
            const isSelected = selected.has(file.name);
            const refreshKey = getAuthFileRefreshKey(file);
            const busy =
              statusUpdating[refreshKey] === true || manualRefreshing[refreshKey] === true;
            const authIndexKey = typeof file.authIndex === 'string' ? file.authIndex : null;
            const hasCooldown = Boolean(file.cooldownSnapshot?.records?.length && authIndexKey);
            const priority =
              account?.priority ?? (Number.isSafeInteger(file.priority) ? file.priority : null);
            const canRefresh = !runtimeOnly && supportsAuthFileManualRefresh(providerKey);
            const canShowModels = !runtimeOnly || providerKey === 'aistudio';

            return (
              <Table.Row
                key={file.name}
                variant={isSelected ? 'selected' : 'default'}
                className="cursor-pointer"
                onClick={() => onOpenDetails(file)}
              >
                {runtimeOnly ? (
                  <Table.Cell />
                ) : (
                  <Table.CheckCell
                    checked={isSelected}
                    onClick={stop}
                    onCheckedChange={() => onToggleSelect(file.name)}
                    aria-label={t('auth_files.card_select', { name: file.name })}
                  />
                )}
                <Table.Cell className="max-w-80">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center">
                      {icon ? <img src={icon} alt="" className="size-5" /> : null}
                    </span>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <button
                        type="button"
                        className="m-0 cursor-pointer truncate border-0 bg-transparent p-0 text-left text-sm font-medium text-kumo-strong outline-none hover:underline focus-visible:ring-2 focus-visible:ring-kumo-brand"
                        title={identity.fullName}
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenDetails(file);
                        }}
                      >
                        {primary}
                      </button>
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-kumo-subtle">
                        <span>{getTypeLabel(t, providerKey || 'unknown')}</span>
                        {planLabel ? <Badge variant="secondary">{planLabel}</Badge> : null}
                        {runtimeOnly ? (
                          <Badge variant="secondary">{t('auth_files.type_virtual')}</Badge>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col items-start gap-1">
                    <Badge variant={STATUS_BADGE[status.kind]} appearance="dot">
                      {statusLabel(status)}
                    </Badge>
                    {status.kind === 'error' ? (
                      <span
                        className="max-w-48 truncate text-xs text-kumo-subtle"
                        title={status.reason || undefined}
                      >
                        {status.reason || t('overview.status_unavailable')}
                      </span>
                    ) : null}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  {account ? (
                    <QuotaBars
                      fiveHour={account.five_hour}
                      weekly={account.seven_day}
                      now={now}
                      compact
                    />
                  ) : (
                    <span className="text-sm text-kumo-subtle">—</span>
                  )}
                </Table.Cell>
                <Table.Cell>
                  {requests === null && tokens.length === 0 ? (
                    <span className="text-sm text-kumo-subtle">—</span>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <UsageSparkline
                        values={tokens}
                        label={t('accounts.usage_sparkline', { tokens: formatTokens(tokenTotal) })}
                      />
                      <span className="text-xs text-kumo-subtle tabular-nums">
                        {t('accounts.requests_count', {
                          count: requests ?? 0,
                          formatted: formatCount(requests),
                        })}
                      </span>
                    </div>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <div className="flex flex-col gap-0.5 tabular-nums">
                    <span className="text-sm font-medium text-kumo-strong">
                      {account?.serving_rank ? `#${account.serving_rank}` : '—'}
                    </span>
                    {priority !== null && priority !== undefined ? (
                      <span className="text-xs text-kumo-subtle">
                        {t('overview.priority_value', { value: priority })}
                      </span>
                    ) : null}
                  </div>
                </Table.Cell>
                <Table.Cell onClick={stop}>
                  <div className="flex items-center justify-end gap-1">
                    {runtimeOnly ? null : (
                      <Switch
                        size="sm"
                        checked={!file.disabled}
                        disabled={disableControls || busy}
                        aria-label={t('auth_files.card_toggle', { name: file.name })}
                        onCheckedChange={(value) => onToggleStatus(file, value)}
                      />
                    )}
                    <DropdownMenu>
                      <DropdownMenu.Trigger
                        render={
                          <Button
                            variant="ghost"
                            shape="square"
                            size="sm"
                            aria-label={t('accounts.row_actions', { name: primary })}
                          >
                            <DotsThreeIcon size={18} weight="bold" />
                          </Button>
                        }
                      />
                      <DropdownMenu.Content>
                        <DropdownMenu.Item icon={InfoIcon} onClick={() => onOpenDetails(file)}>
                          {t('accounts.action_details')}
                        </DropdownMenu.Item>
                        {canRefresh ? (
                          <DropdownMenu.Item
                            icon={ArrowClockwiseIcon}
                            disabled={disableControls || file.disabled === true || busy}
                            onClick={() => onManualRefresh(file)}
                          >
                            {t('accounts.action_refresh_token')}
                          </DropdownMenu.Item>
                        ) : null}
                        {canShowModels ? (
                          <DropdownMenu.Item
                            icon={CubeIcon}
                            disabled={disableControls}
                            onClick={() => onShowModels(file)}
                          >
                            {t('accounts.action_models')}
                          </DropdownMenu.Item>
                        ) : null}
                        {hasCooldown ? (
                          <DropdownMenu.Item
                            icon={SnowflakeIcon}
                            disabled={
                              disableControls ||
                              busy ||
                              Boolean(authIndexKey && cooldownResetting[authIndexKey])
                            }
                            onClick={() => onCooldownReset(file)}
                          >
                            {t('accounts.action_clear_cooldown')}
                          </DropdownMenu.Item>
                        ) : null}
                        {runtimeOnly ? null : (
                          <>
                            <DropdownMenu.Item
                              icon={DownloadSimpleIcon}
                              disabled={disableControls}
                              onClick={() => onDownload(file.name)}
                            >
                              {t('accounts.action_download')}
                            </DropdownMenu.Item>
                            <DropdownMenu.Separator />
                            <DropdownMenu.Item
                              icon={TrashIcon}
                              variant="danger"
                              disabled={disableControls || deleting === file.name || busy}
                              onClick={() => onDelete(file.name)}
                            >
                              {t('accounts.action_delete')}
                            </DropdownMenu.Item>
                          </>
                        )}
                      </DropdownMenu.Content>
                    </DropdownMenu>
                  </div>
                </Table.Cell>
              </Table.Row>
            );
          })}
        </Table.Body>
      </Table>
    </div>
  );
}
