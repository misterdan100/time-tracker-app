import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Optional element rendered before the title (e.g. an icon or a status badge). */
  leading?: React.ReactNode;
  /** Optional element rendered right after the title (badges). */
  titleAddon?: React.ReactNode;
  /** When provided, shows a back arrow that calls this. */
  onBack?: () => void;
  /** Right-side actions (buttons). */
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Page title block shared by every screen. Size/weight/tracking follow the active
 * variant (`.page-title` tokens: `--title-size`, `--title-weight`, `--title-tracking`).
 */
const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  leading,
  titleAddon,
  onBack,
  actions,
  className,
}) => (
  <div
    className={cn(
      'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
      className
    )}
  >
    <div className="flex min-w-0 items-center gap-3">
      {onBack ? (
        <Button variant="ghost" size="icon" className="shrink-0" onClick={onBack} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
      ) : null}
      {leading}
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="page-title truncate text-foreground">{title}</h1>
          {titleAddon}
        </div>
        {subtitle ? (
          <p className="text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
    </div>
    {actions ? (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">{actions}</div>
    ) : null}
  </div>
);

export default PageHeader;
