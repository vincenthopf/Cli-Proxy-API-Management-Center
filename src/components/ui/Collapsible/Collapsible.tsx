import { useState, type HTMLAttributes, type PropsWithChildren, type ReactNode } from 'react';
import { IconChevronDown } from '../icons';

interface CollapsibleProps extends HTMLAttributes<HTMLDetailsElement> {
  label: ReactNode;
  hint?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onToggle?: (event: React.SyntheticEvent<HTMLDetailsElement>) => void;
  flush?: boolean;
}

export function Collapsible({
  label,
  hint,
  defaultOpen = false,
  open,
  onToggle,
  flush,
  children,
  className,
  ...rest
}: PropsWithChildren<CollapsibleProps>) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const resolvedOpen = open ?? uncontrolledOpen;
  const cls = [
    'group overflow-hidden rounded-lg bg-kumo-base ring ring-kumo-line shadow-xs',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  const contentCls = flush
    ? 'border-t border-kumo-hairline'
    : 'flex flex-col gap-3 border-t border-kumo-hairline p-4';

  return (
    <details
      className={cls}
      open={resolvedOpen}
      onToggle={(event) => {
        if (open === undefined) {
          setUncontrolledOpen(event.currentTarget.open);
        }
        onToggle?.(event);
      }}
      {...rest}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-base font-medium text-kumo-default select-none hover:bg-kumo-tint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-kumo-brand focus-visible:ring-inset [&::-webkit-details-marker]:hidden">
        <span className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          <span>{label}</span>
          {hint ? <span className="text-sm font-normal text-kumo-subtle">{hint}</span> : null}
        </span>
        <span
          className="flex size-4 shrink-0 text-kumo-subtle transition-transform duration-150 group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        >
          <IconChevronDown size={16} />
        </span>
      </summary>
      <div className={contentCls}>{children}</div>
    </details>
  );
}
