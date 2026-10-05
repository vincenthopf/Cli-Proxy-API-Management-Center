import { Fragment, type ComponentType, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Text, cn } from '@cloudflare/kumo';
import {
  ArrowDownIcon,
  ArrowRightIcon,
  CaretRightIcon,
  ChatsCircleIcon,
  ListNumbersIcon,
  ProhibitIcon,
  TerminalWindowIcon,
  type IconProps,
} from '@phosphor-icons/react';
import type { RouterMode } from '@/services/api/sidecar';
import { Panel } from '@/components/ui/Panel';
import { formatPercent } from '@/features/overview/format';
import { ResetTime } from '@/features/overview/components/ResetTime';
import { STRATEGY_KEYS, type RoutingFlowSettings, type RoutingOrder } from '../routingFlow';

const COMPACT_ORDER_LIMIT = 4;

export interface RoutingFlowProps {
  settings: RoutingFlowSettings;
  mode: RouterMode | null | undefined;
  order: RoutingOrder | null;
  now: number;
  orderError?: boolean;
  compact?: boolean;
  title?: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

interface FlowStep {
  key: string;
  icon: ComponentType<IconProps>;
  title: string;
  badge?: ReactNode;
  lines: string[];
}

export function RoutingFlow({
  settings,
  mode,
  order,
  now,
  orderError = false,
  compact = false,
  title,
  description,
  actions,
  className,
}: RoutingFlowProps) {
  const { t } = useTranslation();
  const resetAware = mode === 'active';
  const strategyLabel = t(`settings.routing.strategies.${STRATEGY_KEYS[settings.strategy]}.label`);
  const rotates = !resetAware && settings.strategy !== 'fill-first';

  const pickTitle = rotates ? t('routing.flow.pick_rotate_title') : t('routing.flow.pick_title');
  const pickLines = resetAware
    ? [
        t('routing.flow.pick_reset_order'),
        t('routing.flow.pick_strategy', { strategy: strategyLabel }),
      ]
    : [
        t(`routing.flow.pick_${STRATEGY_KEYS[settings.strategy]}`),
        t('routing.flow.pick_reset_off', {
          mode: mode ? t(`routing.mode_${mode}`) : t('routing.flow.unknown'),
        }),
      ];

  const steps: FlowStep[] = [
    {
      key: 'request',
      icon: TerminalWindowIcon,
      title: t('routing.flow.request_title'),
      lines: [t('routing.flow.request_detail')],
    },
    {
      key: 'affinity',
      icon: ChatsCircleIcon,
      title: t('routing.flow.affinity_title'),
      badge: (
        <Badge variant={settings.sessionAffinity ? 'success' : 'neutral'}>
          {settings.sessionAffinity ? t('routing.value_on') : t('routing.value_off')}
        </Badge>
      ),
      lines: settings.sessionAffinity
        ? [
            t('routing.flow.affinity_yes'),
            settings.affinityTTL
              ? t('routing.flow.affinity_ttl', { ttl: settings.affinityTTL })
              : null,
            settings.subagentsShare
              ? t('routing.flow.subagents_share')
              : t('routing.flow.subagents_spread'),
          ].filter((line): line is string => Boolean(line))
        : [t('routing.flow.affinity_off')],
    },
    {
      key: 'pick',
      icon: ListNumbersIcon,
      title: settings.sessionAffinity
        ? t('routing.flow.otherwise', { action: pickTitle })
        : pickTitle,
      badge: (
        <Badge variant={resetAware ? 'info' : 'neutral'}>
          {resetAware ? t('routing.flow.reset_aware_badge') : strategyLabel}
        </Badge>
      ),
      lines: pickLines,
    },
    {
      key: 'limit',
      icon: ProhibitIcon,
      title: t('routing.flow.limit_title'),
      lines: [
        settings.sessionAffinity ? t('routing.flow.limit_move_stay') : t('routing.flow.limit_move'),
        t('routing.flow.limit_pause'),
      ],
    },
  ];

  const horizontal = compact ? 'xl:flex-row' : 'lg:flex-row';
  const arrowRight = compact ? 'hidden xl:block' : 'hidden lg:block';
  const arrowDown = compact ? 'xl:hidden' : 'lg:hidden';

  const entries = order?.entries ?? [];
  const shown = compact ? entries.slice(0, COMPACT_ORDER_LIMIT) : entries;
  const hidden = entries.length - shown.length;
  const orderSource = resetAware ? t('routing.flow.order_reset') : t('routing.flow.order_priority');

  return (
    <Panel className={cn('flex flex-col gap-4', className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            {title ? (
              <Text variant="heading" as="h2">
                {title}
              </Text>
            ) : null}
            {description ? (
              <Text variant="secondary" size="sm">
                {description}
              </Text>
            ) : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}

      <ol className={cn('flex flex-col items-stretch gap-2', horizontal)}>
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <Fragment key={step.key}>
              {index > 0 ? (
                <li
                  aria-hidden="true"
                  className="flex shrink-0 items-center justify-center text-kumo-subtle"
                >
                  <ArrowRightIcon className={cn('size-4', arrowRight)} />
                  <ArrowDownIcon className={cn('size-4', arrowDown)} />
                </li>
              ) : null}
              <li
                className={cn(
                  'flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg bg-kumo-recessed',
                  compact ? 'p-3' : 'p-3 md:p-4'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-kumo-base text-kumo-brand">
                    <Icon aria-hidden="true" className="size-4" weight="duotone" />
                  </span>
                  <span className="text-xs font-medium tabular-nums text-kumo-subtle">
                    {t('routing.flow.step', { step: index + 1 })}
                  </span>
                  {step.badge ? <span className="ml-auto">{step.badge}</span> : null}
                </div>
                <Text bold>{step.title}</Text>
                {step.lines.map((line) => (
                  <Text key={line} variant="secondary" size="sm">
                    {line}
                  </Text>
                ))}
              </li>
            </Fragment>
          );
        })}
      </ol>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <Text bold size="sm">
            {t('routing.flow.order_title')}
          </Text>
          <Text variant="secondary" size="xs">
            {orderSource}
          </Text>
        </div>
        {orderError && entries.length === 0 ? (
          <Text variant="secondary" size="sm">
            {t('routing.flow.order_unavailable')}
          </Text>
        ) : !order ? (
          <Text variant="secondary" size="sm">
            {t('routing.flow.order_loading')}
          </Text>
        ) : entries.length === 0 ? (
          <Text variant="secondary" size="sm">
            {t('routing.flow.order_empty')}
          </Text>
        ) : (
          <ol className="flex items-stretch gap-1.5 overflow-x-auto pb-1">
            {shown.map((entry, index) => (
              <Fragment key={entry.key}>
                {index > 0 ? (
                  <li aria-hidden="true" className="flex shrink-0 items-center text-kumo-subtle">
                    <CaretRightIcon className="size-3.5" />
                  </li>
                ) : null}
                <li
                  className={cn(
                    'flex w-48 shrink-0 flex-col gap-0.5 rounded-lg px-3 py-2',
                    entry.rank === 1 ? 'bg-kumo-tint' : 'bg-kumo-recessed'
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold tabular-nums text-kumo-brand">
                      {t('routing.rank', { rank: entry.rank })}
                    </span>
                    <span className="min-w-0 truncate text-sm text-kumo-default" title={entry.name}>
                      {entry.name}
                    </span>
                  </span>
                  <span className="text-xs text-kumo-subtle">
                    {entry.weeklyLeft === null
                      ? t('routing.flow.weekly_unknown')
                      : t('routing.flow.weekly_left', { percent: formatPercent(entry.weeklyLeft) })}
                  </span>
                  <ResetTime iso={entry.resetsAt} now={now} className="text-xs text-kumo-subtle" />
                </li>
              </Fragment>
            ))}
            {hidden > 0 ? (
              <li className="flex shrink-0 items-center px-2 text-xs text-kumo-subtle">
                {t('routing.flow.order_more', { count: hidden })}
              </li>
            ) : null}
          </ol>
        )}
        {order && order.skipped > 0 ? (
          <Text variant="secondary" size="xs">
            {t('routing.flow.order_skipped', { count: order.skipped })}
          </Text>
        ) : null}
      </div>
    </Panel>
  );
}
