import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Button, ButtonGroup, DropdownMenu, Text } from '@cloudflare/kumo';
import { ArrowRightIcon, CaretDownIcon, HourglassMediumIcon } from '@phosphor-icons/react';
import { Panel } from '@/components/ui/Panel';
import { useNotificationStore } from '@/stores';
import { sidecarApi } from '@/services/api/sidecar';
import {
  sessionGuardApi,
  type SessionGuardPending,
  type SessionGuardStatus,
} from '@/services/api/sessionGuard';
import type { AccountRecord } from '@/features/overview/accounts';
import { formatDuration, formatRelative } from '@/features/overview/format';
import { usePolling } from '@/features/overview/usePolling';
import { useNow } from '@/features/overview/useNow';
import {
  accountLabel,
  moveTargets,
  shortSessionId,
  waitingReason,
  waitingSince,
  type MoveTarget,
} from './sessionGuardLogic';

const POLL_MS = 10_000;

interface WaitingSnapshot {
  status: SessionGuardStatus;
  accounts: AccountRecord[] | null;
}

async function loadSnapshot(): Promise<WaitingSnapshot> {
  const status = await sessionGuardApi.status();
  if (status.pending.length === 0) return { status, accounts: null };
  const accounts = await sidecarApi
    .accounts()
    .then((data) => data.accounts as AccountRecord[])
    .catch(() => null);
  return { status, accounts };
}

const errorText = (err: unknown) => (err instanceof Error ? err.message : String(err));

interface MoveButtonProps {
  targets: MoveTarget[];
  busy: boolean;
  label: (target: MoveTarget) => string;
  onMove: (target: MoveTarget) => void;
}

function MoveButton({ targets, busy, label, onMove }: MoveButtonProps) {
  const { t } = useTranslation();
  const [first, ...rest] = targets;
  if (!first) {
    return (
      <Button size="sm" variant="primary" disabled>
        {t('session_guard.no_target')}
      </Button>
    );
  }
  if (rest.length === 0) {
    return (
      <Button
        size="sm"
        variant="primary"
        icon={ArrowRightIcon}
        loading={busy}
        onClick={() => onMove(first)}
      >
        {label(first)}
      </Button>
    );
  }
  return (
    <ButtonGroup aria-label={label(first)}>
      <Button
        size="sm"
        variant="primary"
        icon={ArrowRightIcon}
        loading={busy}
        onClick={() => onMove(first)}
      >
        {label(first)}
      </Button>
      <DropdownMenu>
        <DropdownMenu.Trigger
          render={
            <Button
              size="sm"
              variant="primary"
              shape="square"
              disabled={busy}
              aria-label={t('session_guard.move_options')}
            >
              <CaretDownIcon />
            </Button>
          }
        />
        <DropdownMenu.Content>
          {rest.map((target) => (
            <DropdownMenu.Item key={target.authId} onClick={() => onMove(target)}>
              {label(target)}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu>
    </ButtonGroup>
  );
}

interface WaitingRowProps {
  item: SessionGuardPending;
  accounts: AccountRecord[] | null;
  now: number;
  busy: boolean;
  onMove: (item: SessionGuardPending, target: MoveTarget) => void;
  onKeep: (item: SessionGuardPending) => void;
}

function WaitingRow({ item, accounts, now, busy, onMove, onKeep }: WaitingRowProps) {
  const { t } = useTranslation();
  const from = accountLabel(accounts ?? [], item.fromAuthId, item.fromLabel);
  const reason = waitingReason(accounts, item.fromAuthId, now);
  const reasonText =
    reason.reason === 'limit' && reason.resetsAt
      ? t('session_guard.reason_limit_resets', { when: formatRelative(reason.resetsAt, now) })
      : t(`session_guard.reason_${reason.reason}`);
  const targets = moveTargets(accounts, item.fromAuthId, now);
  const details = [
    item.lastModel ? t('session_guard.last_model', { model: item.lastModel }) : null,
    item.requestCount > 0 ? t('session_guard.held', { count: item.requestCount }) : null,
  ].filter((line): line is string => Boolean(line));

  return (
    <li className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-kumo-strong" title={item.sessionId}>
            {t('session_guard.conversation', { id: shortSessionId(item.sessionId) })}
          </span>
          <Badge variant="warning" appearance="dot">
            {t('session_guard.waiting_for', {
              duration: formatDuration(waitingSince(item.firstSeen, item.waitingSeconds, now)),
            })}
          </Badge>
        </div>
        <Text variant="secondary" size="sm">
          {t('session_guard.on_account', { account: from })} · {reasonText}
        </Text>
        {details.length > 0 ? (
          <Text variant="secondary" size="xs">
            {details.join(' · ')}
          </Text>
        ) : null}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <MoveButton
          targets={targets}
          busy={busy}
          label={(target) => t('session_guard.move_to', { account: target.label })}
          onMove={(target) => onMove(item, target)}
        />
        <Button size="sm" variant="secondary" disabled={busy} onClick={() => onKeep(item)}>
          {t('session_guard.keep_waiting')}
        </Button>
      </div>
    </li>
  );
}

export interface WaitingConversationsProps {
  className?: string;
}

export function WaitingConversations({ className }: WaitingConversationsProps) {
  const { t } = useTranslation();
  const showNotification = useNotificationStore((state) => state.showNotification);
  const snapshot = usePolling(loadSnapshot, POLL_MS);
  const now = useNow(POLL_MS);
  const [busy, setBusy] = useState<string | null>(null);

  const pending = snapshot.data?.status.pending ?? [];
  if (pending.length === 0) return null;
  const accounts = snapshot.data?.accounts ?? null;

  const run = async (key: string, action: () => Promise<void>, success: string) => {
    setBusy(key);
    try {
      await action();
      showNotification(success, 'success');
    } catch (err) {
      showNotification(t('session_guard.action_failed', { error: errorText(err) }), 'error');
    } finally {
      setBusy(null);
      await snapshot.refresh();
    }
  };

  const handleMove = (item: SessionGuardPending, target: MoveTarget) =>
    void run(
      item.sessionId,
      () => sessionGuardApi.approve(item.sessionId, target.authId),
      t('session_guard.moved', { account: target.label })
    );
  const handleKeep = (item: SessionGuardPending) =>
    void run(
      item.sessionId,
      () => sessionGuardApi.dismiss(item.sessionId),
      t('session_guard.kept')
    );

  const commonTargets = moveTargets(accounts, '', now).filter((target) =>
    pending.every((item) => item.fromAuthId !== target.authId)
  );
  const allTarget = commonTargets[0];

  return (
    <Panel padding="none" as="section" aria-label={t('session_guard.title')} className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-kumo-line px-4 py-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-kumo-warning-tint text-kumo-warning">
            <HourglassMediumIcon aria-hidden="true" className="size-4" weight="duotone" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <Text variant="heading" as="h2">
              {t('session_guard.title')}
            </Text>
            <Text variant="secondary" size="sm">
              {t('session_guard.description', { count: pending.length })}
            </Text>
          </div>
        </div>
        {pending.length > 1 && allTarget ? (
          <Button
            size="sm"
            variant="secondary"
            loading={busy === '*'}
            disabled={busy !== null}
            onClick={() =>
              void run(
                '*',
                () => sessionGuardApi.approveAll(allTarget.authId),
                t('session_guard.moved_all', { account: allTarget.label })
              )
            }
          >
            {t('session_guard.move_all_to', { account: allTarget.label })}
          </Button>
        ) : null}
      </div>
      <ul className="flex flex-col divide-y divide-kumo-line">
        {pending.map((item) => (
          <WaitingRow
            key={item.sessionId}
            item={item}
            accounts={accounts}
            now={now}
            busy={busy === item.sessionId || busy === '*'}
            onMove={handleMove}
            onKeep={handleKeep}
          />
        ))}
      </ul>
    </Panel>
  );
}
