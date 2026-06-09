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

const TINTS: Record<StatTint, { bg: string; border: string; icon: string }> = {
  blue: {
    bg: 'bg-[#DBEAFE] dark:bg-[#16294D]',
    border: 'border-[#BBD3FB] dark:border-[#244272]',
    icon: 'text-brand-blue dark:text-blue-300',
  },
  beige: {
    bg: 'bg-[#FCEBD2] dark:bg-[#33270F]',
    border: 'border-[#F2D6AE] dark:border-[#574521]',
    icon: 'text-brand-orange dark:text-orange-300',
  },
  green: {
    bg: 'bg-[#CFF6DD] dark:bg-[#10301F]',
    border: 'border-[#A7E9BE] dark:border-[#1E5236]',
    icon: 'text-green-600 dark:text-green-400',
  },
  orange: {
    bg: 'bg-[#FFE2C7] dark:bg-[#35240F]',
    border: 'border-[#FBCDA0] dark:border-[#5A3D1E]',
    icon: 'text-brand-orange dark:text-orange-300',
  },
};

/**
 * Tarjeta de métrica estilo dashboard: tint de color, icono en círculo blanco,
 * número grande y label. Datos reales — sin CTA decorativo.
 */
const StatCard: React.FC<StatCardProps> = ({ label, value, icon: Icon, tint = 'blue', hint }) => {
  const t = TINTS[tint];
  return (
    <div className={cn('rounded-3xl border p-5 shadow-soft', t.bg, t.border)}>
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm dark:bg-white/10">
          <Icon className={cn('h-6 w-6', t.icon)} />
        </span>
        {hint && (
          <span className="rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold text-foreground/70 dark:bg-white/10">
            {hint}
          </span>
        )}
      </div>
      <div className="mt-5">
        <div className="text-3xl font-bold leading-tight text-foreground">{value}</div>
        <p className="mt-1 text-sm font-medium text-muted-foreground">{label}</p>
      </div>
    </div>
  );
};

export default StatCard;
