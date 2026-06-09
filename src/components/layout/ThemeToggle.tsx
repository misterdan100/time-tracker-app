import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTheme } from '../../context/ThemeContext';

interface ThemeToggleProps {
  collapsed?: boolean;
}

/**
 * Toggle de tema claro/oscuro. En modo expandido es un control segmentado
 * (sol / luna); en modo colapsado (solo desktop) es un único botón de icono.
 */
const ThemeToggle: React.FC<ThemeToggleProps> = ({ collapsed }) => {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <>
      {/* Segmentado (móvil siempre, desktop cuando NO está colapsado) */}
      <div
        className={cn(
          'flex items-center gap-1 rounded-full bg-secondary p-1',
          collapsed && 'lg:hidden'
        )}
      >
        <button
          type="button"
          onClick={() => setTheme('light')}
          aria-label="Light theme"
          aria-pressed={theme === 'light'}
          className={cn(
            'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors',
            theme === 'light'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Sun className="h-4 w-4" />
          Light
        </button>
        <button
          type="button"
          onClick={() => setTheme('dark')}
          aria-label="Dark theme"
          aria-pressed={theme === 'dark'}
          className={cn(
            'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-full text-xs font-semibold transition-colors',
            theme === 'dark'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          <Moon className="h-4 w-4" />
          Dark
        </button>
      </div>

      {/* Icono único (solo desktop colapsado) */}
      {collapsed && (
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle theme"
          className="hidden h-10 w-10 items-center justify-center self-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground lg:flex"
        >
          {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      )}
    </>
  );
};

export default ThemeToggle;
