import React from 'react';
import { WorkType } from '../../types';
import { cn } from '../../lib/utils';
import { Badge, BADGE_TONE_CLASSES, type BadgeTone } from '../ui/badge';

export const WORK_TYPE_TONES: Record<WorkType, BadgeTone> = {
  Blueprints: 'info',
  '3D Modeling': 'purple',
  'Site Visit': 'warning',
  Consulting: 'teal',
  Other: 'neutral',
};

/** Tone classes per work type (used by the project dialog chips). */
export const WORK_TYPE_STYLES: Record<WorkType, string> = Object.fromEntries(
  (Object.keys(WORK_TYPE_TONES) as WorkType[]).map((t) => [t, BADGE_TONE_CLASSES[WORK_TYPE_TONES[t]]])
) as Record<WorkType, string>;

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
        <Badge key={t} tone={WORK_TYPE_TONES[t]}>
          {t}
        </Badge>
      ))}
    </span>
  );
};

export default WorkTypeTags;
