import { useCallback, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

/** A sortable value: strings compare alphabetically (numeric-aware), numbers numerically. */
export type SortValue = string | number | null | undefined;

/** How to read each sortable column of a row. */
export type SortAccessors<T, K extends string> = Record<K, (row: T) => SortValue>;

function compareValues(a: SortValue, b: SortValue): number {
  const aEmpty = a === null || a === undefined || a === '';
  const bEmpty = b === null || b === undefined || b === '';
  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1; // empties always sink to the bottom
  if (bEmpty) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

/** Stable sort of `rows` by the column named in `sort`. Does not mutate the input. */
export function sortRows<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  accessors: SortAccessors<T, K>
): T[] {
  const read = accessors[sort.key];
  const mult = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((x, y) => {
      const c = compareValues(read(x.row), read(y.row)) * mult;
      return c !== 0 ? c : x.index - y.index;
    })
    .map((x) => x.row);
}

/**
 * Sort state for a table. `toggle(key)` sorts ascending by a new column, and
 * flips the direction when the same column is clicked again.
 */
export function useSort<T, K extends string>(
  rows: T[],
  accessors: SortAccessors<T, K>,
  // NoInfer: K comes from the accessors' keys, not from the initial key literal.
  initial: SortState<NoInfer<K>>
) {
  const [sort, setSort] = useState<SortState<K>>(initial);

  const toggle = useCallback((key: K) => {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'asc' }
    );
  }, []);

  const sorted = useMemo(() => sortRows(rows, sort, accessors), [rows, sort, accessors]);

  return { sort, toggle, sorted };
}

/** Epoch millis of an ISO date string, or null when it does not parse. */
export function dateSortValue(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}
