import { WorkType } from '../types';

/** All work-type tags, in display order. */
export const WORK_TYPES: WorkType[] = ['Blueprints', '3D Modeling', 'Site Visit', 'Consulting', 'Other'];

export function isWorkType(value: unknown): value is WorkType {
  return typeof value === 'string' && (WORK_TYPES as string[]).includes(value);
}

/**
 * Coerce whatever shape a project's work type arrives in into a clean tag list:
 * - `string[]` (the `work_types` column / current JSON backups)
 * - a single string (the legacy `work_type` column / old JSON backups),
 *   optionally comma-separated
 * Unknown values are dropped, duplicates removed, order follows WORK_TYPES.
 */
export function normalizeWorkTypes(input: unknown): WorkType[] {
  const raw: unknown[] = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(',').map((s) => s.trim())
      : [];
  const set = new Set<WorkType>();
  for (const v of raw) if (isWorkType(v)) set.add(v);
  return WORK_TYPES.filter((t) => set.has(t));
}

/** Human-readable list ("Blueprints, 3D Modeling"), used for sorting and plain text. */
export function workTypesLabel(types: WorkType[]): string {
  return types.join(', ');
}
