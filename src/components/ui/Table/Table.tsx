import type {
  HTMLAttributes,
  PropsWithChildren,
  ReactNode,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { LayerCard, Table as KumoTable } from '@cloudflare/kumo';

const join = (...parts: Array<string | false | null | undefined>) =>
  parts.filter(Boolean).join(' ');

interface TableProps extends TableHTMLAttributes<HTMLTableElement> {
  className?: string;
  cols?: ReactNode;
}

export function Table({ children, cols, className, ...rest }: PropsWithChildren<TableProps>) {
  return (
    <LayerCard className="w-full p-0">
      <div className="overflow-x-auto">
        <KumoTable className={join('text-sm', className)} {...rest}>
          {cols ? <colgroup>{cols}</colgroup> : null}
          {children}
        </KumoTable>
      </div>
    </LayerCard>
  );
}

export function TableHeader({
  children,
  className,
  ...rest
}: PropsWithChildren<HTMLAttributes<HTMLTableSectionElement>>) {
  return (
    <KumoTable.Header variant="compact" className={className} {...rest}>
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
      className={join('[&>td]:border-b [&>td]:border-kumo-hairline last:[&>td]:border-b-0', className)}
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
    <KumoTable.Cell
      className={join('align-top', alignRight && 'text-right', className)}
      {...rest}
    >
      {children}
    </KumoTable.Cell>
  );
}
