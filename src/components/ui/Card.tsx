import type { PropsWithChildren, ReactNode } from 'react';
import { LayerCard } from '@cloudflare/kumo';

interface CardProps {
  title?: ReactNode;
  extra?: ReactNode;
  className?: string;
}

export function Card({ title, extra, children, className }: PropsWithChildren<CardProps>) {
  return (
    <LayerCard className={['card !overflow-visible', className].filter(Boolean).join(' ')}>
      {(title || extra) && (
        <div className="card-header">
          <div className="title">{title}</div>
          {extra}
        </div>
      )}
      {children}
    </LayerCard>
  );
}
