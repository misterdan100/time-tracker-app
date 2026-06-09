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
  /** Color del proyecto, para el chip de fecha */
  accent?: string;
  /** Ruta a la que enlaza el botón circular (detalle de proyecto) */
  to: string;
}

/**
 * Fila de actividad: caja de fecha + contenido (proyecto/cliente) + horas + acción
 * circular que enlaza al detalle del proyecto.
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
    <div className="flex items-center gap-4 rounded-2xl border border-border/60 bg-card p-3 shadow-soft sm:p-4">
      {/* Fecha */}
      <div
        className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl"
        style={{ backgroundColor: `${accent}1A` }}
      >
        <span className="text-xl font-bold leading-none" style={{ color: accent }}>
          {format(date, 'dd')}
        </span>
        <span className="mt-0.5 text-[11px] font-medium uppercase text-muted-foreground">
          {format(date, 'MMM', { locale: enUS })}
        </span>
      </div>

      {/* Contenido */}
      <div className="min-w-0 flex-1">
        <Link to={to} className="block truncate font-semibold text-foreground hover:text-green-700 dark:hover:text-green-400">
          {title}
        </Link>
        <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
          <Briefcase className="h-3.5 w-3.5 shrink-0" />
          {subtitle}
        </p>
      </div>

      {/* Horas */}
      <div className="hidden shrink-0 text-right sm:block">
        <p className="text-lg font-bold tabular-nums text-foreground">{hours}h</p>
        <p className="text-xs text-muted-foreground">logged</p>
      </div>

      {/* Acción */}
      <Link
        to={to}
        aria-label={`Open ${title}`}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-soft text-brand-green transition-transform hover:scale-105 dark:bg-green-500/15 dark:text-green-400"
      >
        <ChevronRight className="h-5 w-5" />
      </Link>
    </div>
  );
};

export default ActivityCard;
