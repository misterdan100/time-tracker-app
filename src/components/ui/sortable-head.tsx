import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from './table';
import { cn } from '../../lib/utils';
import type { SortState } from '../../lib/sort';

interface SortableHeadProps<K extends string>
  extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Column this header sorts by. */
  sortKey: K;
  /** Current table sort state. */
  sort: SortState<K>;
  /** Called with `sortKey` when the header is clicked. */
  onSort: (key: K) => void;
  /** Right-align the label (for numeric columns). */
  align?: 'left' | 'right';
  children: React.ReactNode;
}

/**
 * Table header cell whose label is a button that sorts the table by its column.
 * Shows the sort direction on the active column and a faint hint on the others.
 */
export function SortableHead<K extends string>({
  sortKey,
  sort,
  onSort,
  align = 'left',
  className,
  children,
  ...props
}: SortableHeadProps<K>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  const ariaSort = active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none';

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(align === 'right' && 'text-right', className)}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md -mx-1 px-1 py-0.5 font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          active ? 'text-foreground' : 'text-muted-foreground',
          align === 'right' && 'flex-row-reverse'
        )}
        title={`Sort by ${typeof children === 'string' ? children.toLowerCase() : 'this column'}`}
      >
        <span>{children}</span>
        <Icon
          className={cn('h-3.5 w-3.5 shrink-0', active ? 'opacity-100' : 'opacity-40')}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}
