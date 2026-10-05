import type { ReactNode } from 'react';
import { Empty } from '@cloudflare/kumo';
import { IconInbox } from './icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <Empty
      size="sm"
      icon={<IconInbox size={28} className="text-kumo-inactive" />}
      title={title}
      description={description}
      contents={action ? <div className="flex flex-wrap items-center gap-2">{action}</div> : undefined}
    />
  );
}
