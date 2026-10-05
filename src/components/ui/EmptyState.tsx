import type { ReactNode } from 'react';
import { Empty } from '@cloudflare/kumo';
import { PanelEmpty } from './Panel';
import { IconInbox } from './icons';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  bare?: boolean;
}

export function EmptyState({ title, description, action, bare = false }: EmptyStateProps) {
  const icon = <IconInbox size={28} className="text-kumo-inactive" />;
  const contents = action ? (
    <div className="flex flex-wrap items-center gap-2">{action}</div>
  ) : undefined;
  if (bare) {
    return <PanelEmpty icon={icon} title={title} description={description} contents={contents} />;
  }
  return (
    <Empty size="sm" icon={icon} title={title} description={description} contents={contents} />
  );
}
