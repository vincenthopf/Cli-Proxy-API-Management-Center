import type { ReactNode } from 'react';
import { Text } from '@cloudflare/kumo';

interface SectionHeaderProps {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-0.5">
        <Text variant="heading" as="h2">
          {title}
        </Text>
        {description ? (
          <Text variant="secondary" size="sm">
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
