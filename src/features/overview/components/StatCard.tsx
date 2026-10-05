import type { ReactNode } from 'react';
import { Panel } from '@/components/ui/Panel';

interface StatCardProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}

export function StatCard({ label, value, hint }: StatCardProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1 bg-kumo-base p-4 md:p-5">
      <span className="text-sm font-medium text-kumo-default">{label}</span>
      <span className="text-2xl font-semibold tabular-nums text-kumo-strong">{value}</span>
      {hint ? <span className="text-sm text-kumo-subtle">{hint}</span> : null}
    </div>
  );
}

export function StatRow({ children }: { children: ReactNode }) {
  return (
    <Panel
      as="section"
      padding="none"
      className="grid grid-cols-1 gap-px overflow-hidden bg-kumo-line sm:grid-cols-2 xl:grid-cols-4"
    >
      {children}
    </Panel>
  );
}
