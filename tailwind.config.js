import animate from 'tailwindcss-animate';

/** Map a token family to bg/fg/border colors, e.g. tint.blue.bg -> var(--tint-blue-bg). */
const triple = (prefix, names) =>
  Object.fromEntries(
    names.map((n) => [
      n,
      {
        bg: `var(--${prefix}-${n}-bg)`,
        fg: `var(--${prefix}-${n}-fg)`,
        border: `var(--${prefix}-${n}-border)`,
      },
    ])
  );

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Token-driven surfaces (full color values, may carry alpha).
        surface: 'var(--surface)',
        hairline: 'var(--hairline)',
        overlay: 'var(--overlay)',
        sidebar: 'var(--sidebar)',
        'tint-chip': 'var(--tint-chip)',
        'nav-active': {
          DEFAULT: 'var(--nav-active-bg)',
          fg: 'var(--nav-active-fg)',
        },
        link: {
          DEFAULT: 'var(--link)',
          hover: 'var(--link-hover)',
        },
        tint: triple('tint', ['blue', 'beige', 'green', 'orange']),
        status: triple('status', [
          'success',
          'warning',
          'info',
          'neutral',
          'danger',
          'purple',
          'teal',
        ]),
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        panel: 'var(--radius-panel)',
        pill: 'var(--radius-pill)',
        badge: 'var(--radius-badge)',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        float: 'var(--shadow-float)',
        button: 'var(--shadow-button)',
        'nav-active': 'var(--shadow-nav-active)',
        soft: 'var(--shadow-card)',
      },
      height: {
        control: 'var(--control-height)',
        btn: 'var(--button-height)',
        'btn-sm': 'calc(var(--button-height) - 0.25rem)',
        'btn-lg': 'calc(var(--button-height) + 0.25rem)',
      },
      width: {
        btn: 'var(--button-height)',
        sidebar: 'var(--sidebar-width)',
      },
      spacing: {
        'sidebar-gap': 'var(--sidebar-gap)',
      },
    },
  },
  plugins: [animate],
};
