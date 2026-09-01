import React from 'react';
import { WorkType } from '../../types';
import { cn } from '../../lib/utils';

export const WORK_TYPE_STYLES: Record<WorkType, string> = {
  Blueprints: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-300',
  '3D Modeling': 'bg-purple-100 text-purple-800 dark:bg-purple-500/15 dark:text-purple-300',
  'Site Visit': 'bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300',
  Consulting: 'bg-teal-100 text-teal-800 dark:bg-teal-500/15 dark:text-teal-300',
  Other: 'bg-gray-100 text-gray-800 dark:bg-white/10 dark:text-gray-300',
};

interface WorkTypeTagsProps {
  types: WorkType[];
  className?: string;
  /** Text shown when the project has no tags. */
  emptyLabel?: string;
}

/** Renders a project's work types as colored pills. */
const WorkTypeTags: React.FC<WorkTypeTagsProps> = ({ types, className, emptyLabel = '—' }) => {
  if (!types || types.length === 0) {
    return <span className={cn('text-muted-foreground', className)}>{emptyLabel}</span>;
  }
  return (
    <span className={cn('flex flex-wrap gap-1', className)}>
      {types.map((t) => (
        <span
          key={t}
          className={cn(
            'whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium',
            WORK_TYPE_STYLES[t]
          )}
        >
          {t}
        </span>
      ))}
    </span>
  );
};

export default WorkTypeTags;
