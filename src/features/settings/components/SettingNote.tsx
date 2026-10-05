import type { ReactNode } from 'react';
import { InfoIcon } from '@phosphor-icons/react';

export function SettingNote({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <InfoIcon
        aria-hidden="true"
        weight="fill"
        className="mt-0.5 size-4 shrink-0 text-kumo-info"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-sm font-medium text-kumo-default">{title}</span>
        {description ? <span className="text-sm text-kumo-subtle">{description}</span> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
