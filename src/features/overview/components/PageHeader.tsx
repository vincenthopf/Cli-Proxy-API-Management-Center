import type { ReactNode } from 'react';
import { Text } from '@cloudflare/kumo';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <Text variant="heading" size="lg" as="h1">
          {title}
        </Text>
        {description ? <Text variant="secondary">{description}</Text> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}
