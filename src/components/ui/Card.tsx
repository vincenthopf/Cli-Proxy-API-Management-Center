import type { PropsWithChildren, ReactNode } from 'react';
import { cn } from '@cloudflare/kumo';
import { Panel } from '@/components/ui/Panel';

interface CardProps {
  title?: ReactNode;
  extra?: ReactNode;
  className?: string;
}

export function Card({ title, extra, children, className }: PropsWithChildren<CardProps>) {
  return (
    <Panel padding="none" className={cn('p-5', className)}>
      {(title || extra) && (
        <div className="-mx-5 -mt-5 mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-kumo-line px-5 py-3">
          <div className="min-w-0 flex-1 text-base font-semibold text-kumo-strong">{title}</div>
          {extra}
        </div>
      )}
      {children}
    </Panel>
  );
}
