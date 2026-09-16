import * as React from 'react';
import { AlertOctagon, AlertTriangle, CheckCircle2, Info, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BADGE_TONE_CLASSES, type BadgeTone } from './badge';

type CalloutTone = Extract<BadgeTone, 'success' | 'warning' | 'info' | 'danger'>;

const ICONS: Record<CalloutTone, LucideIcon> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  danger: AlertOctagon,
};

interface CalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  tone: CalloutTone;
  /** Override the default icon; pass `null` to hide it. */
  icon?: LucideIcon | null;
  /** Optional right-aligned action (e.g. a button). */
  action?: React.ReactNode;
}

/** Inline banner (profile completeness, password-reset feedback, "View as" notice, …). */
export const Callout: React.FC<CalloutProps> = ({
  tone,
  icon,
  action,
  className,
  children,
  ...props
}) => {
  const Icon = icon === undefined ? ICONS[tone] : icon;
  return (
    <div
      role={tone === 'warning' || tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'flex flex-col gap-2 rounded-card border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between',
        BADGE_TONE_CLASSES[tone],
        className
      )}
      {...props}
    >
      <span className="flex items-start gap-2">
        {Icon ? <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> : null}
        <span>{children}</span>
      </span>
      {action ? <span className="shrink-0">{action}</span> : null}
    </div>
  );
};

export default Callout;
