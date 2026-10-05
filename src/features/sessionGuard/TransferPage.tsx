import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Badge, Button, Link, Loader, Text } from '@cloudflare/kumo';
import { ArrowRightIcon, CheckCircleIcon, InfoIcon } from '@phosphor-icons/react';
import { Panel } from '@/components/ui/Panel';
import { Select } from '@/components/ui/Select';
import { sidecarApi } from '@/services/api/sidecar';
import { sessionGuardApi, type SessionGuardStatus } from '@/services/api/sessionGuard';
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
} from './sessionGuardLogic';

interface Snapshot {
  status: SessionGuardStatus;
  accounts: AccountRecord[];
}

async function loadSnapshot(): Promise<Snapshot> {
  const [status, accounts] = await Promise.all([
    sessionGuardApi.status(),
    sidecarApi
      .accounts()
      .then((data) => data.accounts as AccountRecord[])
      .catch(() => []),
  ]);
  return { status, accounts };
}

type Outcome = { kind: 'moved'; account: string } | { kind: 'kept' } | null;

export function TransferPage() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const sessionId = params.get('session') ?? '';
  const now = useNow();
  const snapshot = usePolling(loadSnapshot, 10_000);
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<Outcome>(null);

  const status = snapshot.data?.status;
  const accounts = snapshot.data?.accounts ?? [];
  const pending = status?.pending.find((item) => item.sessionId === sessionId) ?? null;
  const transfer = status?.recentTransfers.find((item) => item.sessionId === sessionId) ?? null;
  const targets = pending ? moveTargets(accounts, pending.fromAuthId, now) : [];

  useEffect(() => {
    if (!target && targets.length > 0) setTarget(targets[0].authId);
  }, [target, targets]);

  const move = async () => {
    if (!pending || !target) return;
    setBusy(true);
    setError(null);
    try {
      await sessionGuardApi.approve(pending.sessionId, target);
      const chosen = targets.find((item) => item.authId === target);
      setOutcome({ kind: 'moved', account: chosen?.label ?? target });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const keep = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    try {
      await sessionGuardApi.dismiss(pending.sessionId);
      setOutcome({ kind: 'kept' });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const body = () => {
    if (outcome?.kind === 'moved') {
      return (
        <div className="flex flex-col items-start gap-3">
          <CheckCircleIcon size={32} weight="fill" className="text-kumo-success" />
          <h1 className="text-xl font-semibold text-kumo-strong">{t('transfer.moved_title')}</h1>
          <p className="text-sm text-kumo-default">
            {t('transfer.moved_body', { account: outcome.account })}
          </p>
        </div>
      );
    }
    if (outcome?.kind === 'kept') {
      return (
        <div className="flex flex-col items-start gap-3">
          <InfoIcon size={32} weight="fill" className="text-kumo-info" />
          <h1 className="text-xl font-semibold text-kumo-strong">{t('transfer.kept_title')}</h1>
          <p className="text-sm text-kumo-default">{t('transfer.kept_body')}</p>
        </div>
      );
    }
    if (!sessionId) {
      return <p className="text-sm text-kumo-default">{t('transfer.missing_session')}</p>;
    }
    if (snapshot.loading && !snapshot.data) {
      return (
        <div className="flex items-center gap-2 text-sm text-kumo-subtle">
          <Loader size="sm" />
          {t('transfer.loading')}
        </div>
      );
    }
    if (snapshot.error && !snapshot.data) {
      return <p className="text-sm text-kumo-danger">{snapshot.error}</p>;
    }
    if (!pending) {
      return (
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-xl font-semibold text-kumo-strong">
            {t('transfer.not_waiting_title')}
          </h1>
          <p className="text-sm text-kumo-default">
            {transfer
              ? t('transfer.already_moved', { account: transfer.toLabel || transfer.toAuthId })
              : t('transfer.not_waiting_body')}
          </p>
        </div>
      );
    }

    const from = accountLabel(accounts, pending.fromAuthId, pending.fromLabel);
    const reason = waitingReason(accounts, pending.fromAuthId, now);
    const reasonText =
      reason.reason === 'limit' && reason.resetsAt
        ? t('session_guard.reason_limit_resets', { when: formatRelative(reason.resetsAt, now) })
        : t(`session_guard.reason_${reason.reason}`);

    return (
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-kumo-strong">{t('transfer.title')}</h1>
            <Badge variant="warning" appearance="dot">
              {t('session_guard.waiting_for', {
                duration: formatDuration(
                  waitingSince(pending.firstSeen, pending.waitingSeconds, now)
                ),
              })}
            </Badge>
          </div>
          <Text variant="secondary" size="sm">
            {t('session_guard.conversation', { id: shortSessionId(pending.sessionId) })}
            {pending.lastModel ? ` · ${pending.lastModel}` : ''}
          </Text>
        </div>

        <dl className="flex flex-col divide-y divide-kumo-line rounded-lg border border-kumo-line text-sm">
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <dt className="text-kumo-subtle">{t('transfer.current_account')}</dt>
            <dd className="font-medium text-kumo-strong">{from}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2 px-4 py-3">
            <dt className="text-kumo-subtle">{t('transfer.why')}</dt>
            <dd className="text-kumo-default">{reasonText}</dd>
          </div>
        </dl>

        {targets.length === 0 ? (
          <p className="text-sm text-kumo-default">{t('session_guard.no_target')}</p>
        ) : (
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-kumo-default">{t('transfer.move_to_label')}</span>
            <Select
              value={target}
              onChange={setTarget}
              options={targets.map((item) => ({ value: item.authId, label: item.label }))}
              ariaLabel={t('transfer.move_to_label')}
            />
          </label>
        )}

        <p className="text-sm text-kumo-subtle">{t('transfer.cache_note')}</p>

        {error ? <p className="text-sm text-kumo-danger">{error}</p> : null}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="primary"
            icon={ArrowRightIcon}
            loading={busy}
            disabled={!target || targets.length === 0}
            onClick={() => void move()}
          >
            {t('transfer.move_button')}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => void keep()}>
            {t('session_guard.keep_waiting')}
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 py-6">
      <Panel padding="md">{body()}</Panel>
      <div className="text-sm">
        <Link href="/">{t('transfer.back')}</Link>
      </div>
    </div>
  );
}
