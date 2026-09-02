import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  collapsed?: boolean;
}

/**
 * Light/dark toggle. Expanded: a segmented control (sun / moon) with the active
 * segment filled in the accent color; collapsed (desktop only): a single icon button.
 */
const ThemeToggle: React.FC<ThemeToggleProps> = ({ collapsed }) => {
  const { theme, setTheme, toggleTheme } = useTheme();

  const segment = (active: boolean) =>
    cn(
      'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-[calc(var(--radius-pill)-3px)] text-xs font-semibold transition-colors',
      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
    );

  return (
    <>
      <div
        className={cn(
          'flex items-center gap-1 rounded-pill border border-border bg-card p-1',
          collapsed && 'lg:hidden'
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Light theme"
          aria-pressed={theme === 'light'}
          className={segment(theme === 'light')}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Dark theme"
          aria-pressed={theme === 'dark'}
          className={segment(theme === 'dark')}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </div>

      {collapsed && (
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="hidden h-10 w-10 items-center justify-center self-center rounded-control text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      )}
    </>
  );
};

export default ThemeToggle;
