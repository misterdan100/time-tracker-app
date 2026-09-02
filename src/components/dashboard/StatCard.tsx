import React from 'react';
import { type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export type StatTint = 'blue' | 'beige' | 'green' | 'orange';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  tint?: StatTint;
  hint?: string;
}

// The card itself is a plain surface; the tint (design tokens --tint-*) colors
// only the icon chip, so metrics stay compact and consistent with the rest of the UI.
const TINTS: Record<StatTint, string> = {
  blue: 'bg-tint-blue-bg text-tint-blue-fg border-tint-blue-border',
  beige: 'bg-tint-beige-bg text-tint-beige-fg border-tint-beige-border',
  green: 'bg-tint-green-bg text-tint-green-fg border-tint-green-border',
  orange: 'bg-tint-orange-bg text-tint-orange-fg border-tint-orange-border',
};

/** Compact metric card: tinted icon chip, big number, label and an optional hint pill. */
const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, tint = 'blue', hint }) => (
  <div className="surface flex items-center gap-4 p-4">
    <span
      className={cn(
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-control border',
        TINTS[tint]
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-2xl font-bold leading-tight tracking-tight text-foreground">
        {value}
      </div>
    </div>
    {hint && (
      <span className="shrink-0 self-start rounded-badge bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
        {hint}
      </span>
    )}
  </div>
);

export default StatCard;
