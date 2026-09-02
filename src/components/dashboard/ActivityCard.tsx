import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

interface ActivityCardProps {
  date: Date;
  title: string;
  subtitle: string;
  hours: number;
  /** Project color (data, not theme) for the date chip. */
  accent?: string;
  /** Route for the row's action button (project detail). */
  to: string;
}

/**
 * Activity row: date chip + project/client + hours + a round action linking to the project.
 * The project color is user data and stays inline; everything else uses design tokens.
 */
const ActivityCard: React.FC<ActivityCardProps> = ({
  date,
  title,
  subtitle,
  hours,
  accent = '#22C55E',
  to,
}) => {
  return (
    <div className="surface flex items-center gap-4 p-3 sm:p-4">
      {/* Date */}
      <div
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-control"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <span className="text-xl font-bold leading-none" style={{ color: accent }}>
          {format(date, 'dd')}
        </span>
        <span className="mt-0.5 text-[11px] font-medium uppercase text-muted-foreground">
          {format(date, 'MMM', { locale: enUS })}
        </span>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <Link to={to} className="block truncate font-semibold text-foreground transition-colors hover:text-link">
          {title}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          {subtitle}
        </p>
      </div>

      {/* Hours */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-lg font-bold tabular-nums text-foreground">{hours}h</p>
        <p className="text-xs text-muted-foreground">logged</p>
      </div>

      {/* Action */}
      <Link
        to={to}
        aria-label={`Open ${title}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-nav-active text-nav-active-fg transition-transform hover:scale-105"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
};

export default ActivityCard;
