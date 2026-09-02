import * as React from 'react';
import { cn } from '../../lib/utils';

export type BadgeTone = 'success' | 'warning' | 'info' | 'neutral' | 'danger' | 'purple' | 'teal';

export const BADGE_TONE_CLASSES: Record<BadgeTone, string> = {
  success: 'bg-status-success-bg text-status-success-fg border-status-success-border',
  warning: 'bg-status-warning-bg text-status-warning-fg border-status-warning-border',
  info: 'bg-status-info-bg text-status-info-fg border-status-info-border',
  neutral: 'bg-status-neutral-bg text-status-neutral-fg border-status-neutral-border',
  danger: 'bg-status-danger-bg text-status-danger-fg border-status-danger-border',
  purple: 'bg-status-purple-bg text-status-purple-fg border-status-purple-border',
  teal: 'bg-status-teal-bg text-status-teal-fg border-status-teal-border',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

/** Small status pill. Colors, radius and border come from the active variant's status tokens. */
export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ tone = 'neutral', className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-badge border px-2 py-0.5 text-xs font-medium leading-5',
        BADGE_TONE_CLASSES[tone],
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';

export default Badge;
