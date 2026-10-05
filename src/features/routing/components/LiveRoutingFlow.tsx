import { useMemo } from 'react';
import { sidecarApi } from '@/services/api/sidecar';
import { sessionGuardApi } from '@/services/api/sessionGuard';
import { useConfigStore } from '@/stores';
import { usePolling } from '@/features/overview/usePolling';
import { useNow } from '@/features/overview/useNow';
import {
  buildRoutingOrder,
  readRoutingFlowSettings,
  type RoutingFlowSettings,
} from '../routingFlow';
import { RoutingFlow, type RoutingFlowProps } from './RoutingFlow';

type LiveRoutingFlowProps = Omit<
  RoutingFlowProps,
  'settings' | 'mode' | 'guardMode' | 'order' | 'now'
> & {
  settings?: RoutingFlowSettings;
};

export function LiveRoutingFlow({ settings, ...rest }: LiveRoutingFlowProps) {
  const router = usePolling(() => sidecarApi.router(), 30_000);
  const accounts = usePolling(() => sidecarApi.accounts(), 60_000);
  const guard = usePolling(() => sessionGuardApi.status(), 30_000);
  const config = useConfigStore((state) => state.config);
  const now = useNow();

  const resolved = useMemo(
    () => settings ?? readRoutingFlowSettings(config?.raw, config?.routingStrategy),
    [config, settings]
  );
  const ready = router.data !== null || accounts.data !== null;
  const order = useMemo(
    () => (ready ? buildRoutingOrder(router.data, accounts.data?.accounts, now) : null),
    [accounts.data, now, ready, router.data]
  );

  return (
    <RoutingFlow
      {...rest}
      settings={resolved}
      mode={router.data?.mode}
      guardMode={guard.error ? null : (guard.data?.mode ?? null)}
      order={order}
      now={now}
      orderError={Boolean(router.error && accounts.error)}
    />
  );
}
