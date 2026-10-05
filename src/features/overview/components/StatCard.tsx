import type { ReactNode } from 'react';
import { LayerCard } from '@cloudflare/kumo';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <LayerCard>
      <LayerCard.Secondary className="text-sm text-kumo-subtle">{label}</LayerCard.Secondary>
      <LayerCard.Primary className="flex flex-col gap-1">
        <span className="text-2xl font-semibold text-kumo-default tabular-nums">{value}</span>
        {hint ? <span className="text-xs text-kumo-subtle">{hint}</span> : null}
      </LayerCard.Primary>
    </LayerCard>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</section>
  );
}
