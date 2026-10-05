import type {
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { Table as KumoTable } from '@cloudflare/kumo';
import { Panel } from '@/components/ui/Panel';

const join = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  className?: string;
  cols?: ReactNode;
  bordered?: boolean;
}

export function Table({
  children,
  cols,
  className,
  bordered = true,
  ...rest
}: PropsWithChildren<TableProps>) {
  const table = (
    <div className="overflow-x-auto">
      <KumoTable className={join('text-sm', className)} {...rest}>
        {cols ? <colgroup>{cols}</colgroup> : null}
        {children}
      </KumoTable>
    </div>
  );
  if (!bordered) return table;
  return (
    <Panel padding="none" className="w-full overflow-hidden">
      {table}
    </Panel>
  );
}

export function TableHeader({
  children,
  className,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <KumoTable.Header
      variant="compact"
      className={join('[&_th]:border-kumo-line [&_th]:bg-kumo-recessed', className)}
      {...rest}
    >
      {children}
    </KumoTable.Header>
  );
}

export function TableBody({
  children,
  className,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <KumoTable.Body className={className} {...rest}>
      {children}
    </KumoTable.Body>
  );
}

interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export function TableRow({
  children,
  className,
  selected,
  ...rest
}: PropsWithChildren<TableRowProps>) {
  return (
    <KumoTable.Row
      variant={selected ? 'selected' : 'default'}
      className={join(
        '[&>td]:border-b [&>td]:border-kumo-hairline last:[&>td]:border-b-0',
        !selected && 'even:bg-kumo-base even:[--kumo-table-row-bg:var(--color-kumo-base)]',
        className
      )}
      {...rest}
    >
      {children}
    </KumoTable.Row>
  );
}

interface TableHeadProps extends ThHTMLAttributes<HTMLTableCellElement> {
  alignRight?: boolean;
}

export function TableHead({
  children,
  className,
  alignRight,
  ...rest
}: PropsWithChildren<TableHeadProps>) {
  return (
    <KumoTable.Head
      className={join('font-medium text-kumo-subtle', alignRight && 'text-right', className)}
      {...rest}
    >
      {children}
    </KumoTable.Head>
  );
}

interface TableCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  alignRight?: boolean;
}

export function TableCell({
  children,
  className,
  alignRight,
  ...rest
}: PropsWithChildren<TableCellProps>) {
  return (
    <KumoTable.Cell className={join('align-top', alignRight && 'text-right', className)} {...rest}>
      {children}
    </KumoTable.Cell>
  );
}
