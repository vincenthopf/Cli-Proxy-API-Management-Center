import { apiClient } from './client';
import { useAuthStore } from '@/stores';
import { normalizeApiBase } from '@/utils/connection';
import { isRecord } from '@/utils/helpers';

export type SessionGuardMode = 'confirm' | 'auto';

export interface SessionGuardPending {
  sessionId: string;
  fromAuthId: string;
  fromLabel: string;
  firstSeen: string | null;
  lastSeen: string | null;
  lastModel: string;
  requestCount: number;
  waitingSeconds: number;
}

export interface SessionGuardApproval {
  sessionId: string;
  targetAuthId: string;
  approvedAt: string | null;
}

export interface SessionGuardTransfer {
  sessionId: string;
  fromAuthId: string;
  fromLabel: string;
  toAuthId: string;
  toLabel: string;
  reason: string;
  at: string | null;
}

export interface SessionGuardStatus {
  mode: SessionGuardMode;
  pending: SessionGuardPending[];
  approved: SessionGuardApproval[];
  bindingsCount: number;
  recentTransfers: SessionGuardTransfer[];
  serverTime: string | null;
}

export const SESSION_GUARD_PATH = '/v0/management/session-guard';

const routeUrl = (action: string): string => {
  const base = normalizeApiBase(useAuthStore.getState().apiBase);
  return `${base}${SESSION_GUARD_PATH}/${action}`;
};

const str = (value: unknown): string => (typeof value === 'string' ? value : '');
const time = (value: unknown): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;
const num = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;
const list = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

export const normalizeSessionGuardMode = (value: unknown): SessionGuardMode =>
  value === 'auto' ? 'auto' : 'confirm';

export function normalizeSessionGuardStatus(data: unknown): SessionGuardStatus {
  const raw = isRecord(data) ? data : {};
  return {
    mode: normalizeSessionGuardMode(raw.mode),
    pending: list(raw.pending)
      .map((item) => ({
        sessionId: str(item.session_id),
        fromAuthId: str(item.from_auth_id),
        fromLabel: str(item.from_label),
        firstSeen: time(item.first_seen),
        lastSeen: time(item.last_seen),
        lastModel: str(item.last_model),
        requestCount: num(item.request_count),
        waitingSeconds: num(item.waiting_seconds),
      }))
      .filter((item) => item.sessionId),
    approved: list(raw.approved)
      .map((item) => ({
        sessionId: str(item.session_id),
        targetAuthId: str(item.target_auth_id),
        approvedAt: time(item.approved_at),
      }))
      .filter((item) => item.sessionId),
    bindingsCount: num(raw.bindings_count),
    recentTransfers: list(raw.recent_transfers).map((item) => ({
      sessionId: str(item.session_id),
      fromAuthId: str(item.from_auth_id),
      fromLabel: str(item.from_label),
      toAuthId: str(item.to_auth_id),
      toLabel: str(item.to_label),
      reason: str(item.reason),
      at: time(item.at),
    })),
    serverTime: time(raw.server_time),
  };
}

export const sessionGuardApi = {
  async status(): Promise<SessionGuardStatus> {
    return normalizeSessionGuardStatus(await apiClient.get(routeUrl('status')));
  },
  async approve(sessionId: string, targetAuthId?: string): Promise<void> {
    await apiClient.post(routeUrl('approve'), {
      session_id: sessionId,
      ...(targetAuthId ? { target_auth_id: targetAuthId } : {}),
    });
  },
  async approveAll(targetAuthId?: string): Promise<void> {
    await apiClient.post(
      routeUrl('approve-all'),
      targetAuthId ? { target_auth_id: targetAuthId } : {}
    );
  },
  async dismiss(sessionId: string): Promise<void> {
    await apiClient.post(routeUrl('dismiss'), { session_id: sessionId });
  },
  async setMode(mode: SessionGuardMode): Promise<SessionGuardMode> {
    const data = await apiClient.post(routeUrl('mode'), { mode });
    return normalizeSessionGuardMode(isRecord(data) ? data.mode : mode);
  },
};
