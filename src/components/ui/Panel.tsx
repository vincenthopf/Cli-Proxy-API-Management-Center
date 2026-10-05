import type { ElementType, HTMLAttributes, ReactNode } from 'react';
import { Empty, cn } from '@cloudflare/kumo';

export type PanelPadding = 'none' | 'sm' | 'md';

const PANEL_PADDING: Record<PanelPadding, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-4 md:p-5',
};

export const PANEL_CLASSES =
  'min-w-0 rounded-lg border border-kumo-line bg-kumo-base text-kumo-default';

export interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  padding?: PanelPadding;
}

export function Panel({ as: Component = 'div', padding = 'md', className, ...rest }: PanelProps) {
  return <Component className={cn(PANEL_CLASSES, PANEL_PADDING[padding], className)} {...rest} />;
}

interface PanelEmptyProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  contents?: ReactNode;
  className?: string;
}

export function PanelEmpty({ icon, title, description, contents, className }: PanelEmptyProps) {
  return (
    <Empty
      size="sm"
      icon={icon}
      title={title}
      description={description}
      contents={contents}
      className={cn('rounded-none border-0 bg-transparent px-4 py-8', className)}
    />
  );
}
