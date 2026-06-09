import React from 'react';
import { cn } from '../lib/utils';

interface LogoProps {
  /**
   * "full" = icon + "arq time" wordmark side by side,
   * "stacked" = icon on top, wordmark below,
   * "mark" = icon only
   */
  variant?: 'full' | 'stacked' | 'mark';
  className?: string;
}

const SRC: Record<NonNullable<LogoProps['variant']>, string> = {
  full: '/logo.svg',
  stacked: '/logo-stacked.svg',
  mark: '/logo-mark.svg',
};

/**
 * App logo. Renders the SVG assets from /public so it can be reused
 * across the sidebar, mobile header, login screen, etc.
 *
 * Sizing is controlled via className (set a height, width stays auto):
 *   <Logo className="h-10 w-auto" />
 *   <Logo variant="mark" className="h-8 w-8" />
 */
const Logo: React.FC<LogoProps> = ({ variant = 'full', className }) => (
  <img
    src={SRC[variant]}
    alt="Arq Time"
    className={cn('dark:invert dark:hue-rotate-180', className)}
    draggable={false}
  />
);

export default Logo;
