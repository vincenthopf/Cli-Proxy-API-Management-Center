import { useState, type ReactNode } from 'react';
import { Collapsible, Text } from '@cloudflare/kumo';
import { CaretDownIcon } from '@phosphor-icons/react';
import { Panel } from '@/components/ui/Panel';
import { useSettingsForm } from '../settingsForm';

export function SettingsGroup({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <Text variant="heading" as="h3">
            {title}
          </Text>
          {description ? (
            <Text variant="secondary" size="sm">
              {description}
            </Text>
          ) : null}
        </div>
        {action}
      </div>
      <Panel padding="none" className="divide-y divide-kumo-line px-4 md:px-5">
        {children}
      </Panel>
    </section>
  );
}

export function SettingsDisclosure({
  title,
  description,
  fieldIds,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: ReactNode;
  fieldIds: readonly string[];
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const { focus, changedFieldIds } = useSettingsForm();
  const [open, setOpen] = useState(defaultOpen);
  const [seenFocusId, setSeenFocusId] = useState<number | null>(null);
  if (focus && focus.id !== seenFocusId) {
    setSeenFocusId(focus.id);
    if (!open && fieldIds.includes(focus.fieldId)) setOpen(true);
  }
  const changedCount = fieldIds.filter((id) => changedFieldIds.has(id)).length;

  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="py-2">
      <Collapsible.Trigger className="group flex w-full items-center justify-between gap-4 rounded-lg py-3 text-left focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:outline-none">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-base font-medium text-kumo-default">
            {title}
            {changedCount > 0 ? (
              <span className="size-1.5 rounded-full bg-kumo-brand" aria-hidden="true" />
            ) : null}
          </span>
          {description ? <span className="text-sm text-kumo-subtle">{description}</span> : null}
        </span>
        <CaretDownIcon
          aria-hidden="true"
          className="size-4 shrink-0 text-kumo-subtle transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
        />
      </Collapsible.Trigger>
      <Collapsible.Panel
        keepMounted
        className="divide-y divide-kumo-line border-t border-kumo-line data-[closed]:hidden"
      >
        {children}
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}
