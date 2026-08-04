/** @type {import('tailwindcss').Config} */

// Every colour resolves to a CSS variable, so light and dark are one source of
// truth. See src/index.css for the token values.
const token = (name) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /* ── dispatch desk palette ── */
        paper: token('paper'),
        panel: {
          DEFAULT: token('panel'),
          sunk: token('panel-sunk'),
          raised: token('panel-raised'),
        },
        line: {
          DEFAULT: token('line'),
          strong: token('line-strong'),
        },
        ink: {
          DEFAULT: token('ink'),
          soft: token('ink-soft'),
          muted: token('ink-muted'),
          on: token('on-ink'),
          'on-muted': token('on-ink-muted'),
        },
        // Sidebar chrome: dark in both themes, so it does not invert.
        nav: {
          DEFAULT: token('nav'),
          fg: token('nav-fg'),
          'fg-muted': token('nav-fg-muted'),
        },
        signal: {
          DEFAULT: token('signal'),
          ink: token('signal-ink'),
          soft: token('signal-soft'),
        },
        pine: {
          DEFAULT: token('pine'),
          ink: token('pine-ink'),
          soft: token('pine-soft'),
        },
        rust: {
          DEFAULT: token('rust'),
          ink: token('rust-ink'),
          soft: token('rust-soft'),
        },
        draft: {
          DEFAULT: token('draft'),
          soft: token('draft-soft'),
        },

        /* ── shadcn/ui compatibility ── */
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

        /* ── legacy token names, remapped onto the new palette ──
           Keeps pages that have not been reworked yet visually consistent. */
        surface: token('paper'),
        'surface-bright': token('panel'),
        'surface-dim': token('panel-raised'),
        'surface-container': token('panel-raised'),
        'surface-container-high': token('panel-raised'),
        'surface-container-highest': token('line'),
        'surface-container-low': token('panel-sunk'),
        'surface-container-lowest': token('panel'),
        'on-surface': token('ink'),
        'on-surface-variant': token('ink-muted'),
        outline: token('line-strong'),
        'outline-variant': token('line'),
        'sid-primary': token('ink'),
        'sid-primary-container': token('ink-soft'),
        'sid-primary-light': token('panel-raised'),
        'sid-error': token('rust'),
        'sid-tertiary': token('signal-ink'),
      },
      borderRadius: {
        lg: 'calc(var(--radius) + 2px)',
        md: 'var(--radius)',
        sm: 'calc(var(--radius) - 1px)',
      },
      fontFamily: {
        sans: ['Archivo', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        narrow: ['"Archivo Narrow"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      fontSize: {
        // A tight scale for a dense operations desk.
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        display: ['2.75rem', { lineHeight: '1', letterSpacing: '-0.035em' }],
        figure: ['1.75rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },
      boxShadow: {
        // Panels sit on hairlines, not shadows. Shadows are for things that
        // genuinely float above the desk.
        pop: '0 12px 32px -8px rgb(0 0 0 / 0.18), 0 2px 6px -2px rgb(0 0 0 / 0.10)',
        rail: 'inset 0 -1px 0 0 rgb(var(--line))',
      },
      transitionTimingFunction: {
        desk: 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
