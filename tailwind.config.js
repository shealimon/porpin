/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      /** Mobile 320+, tablet from 481px, desktop from 769px (alongside default sm/md/lg). */
      screens: {
        xs: '320px',
        tab: '481px',
        desk: '769px',
      },
      fontFamily: {
        sans: [
          '"Geist Variable"',
          '"Plus Jakarta Sans"',
          'system-ui',
          'Segoe UI',
          'sans-serif',
        ],
        display: ['Fraunces', 'Georgia', 'serif'],
        heading: ['Fraunces', 'Georgia', 'serif'],
        /** Voltix-style landing (Syne + Outfit) — see LandingPage */
        voltix: ['Syne', 'system-ui', 'sans-serif'],
        outfit: ['Outfit', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)',
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)',
        },
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)',
        },
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: 'var(--sidebar-primary)',
          'primary-foreground': 'var(--sidebar-primary-foreground)',
          accent: 'var(--sidebar-accent)',
          'accent-foreground': 'var(--sidebar-accent-foreground)',
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)',
        },
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        /** Electric lime + violet (Voltix-adjacent marketing) */
        voltix: {
          bg: '#050506',
          surface: '#0c0c0f',
          elevated: '#141419',
          lime: '#c8ff00',
          'lime-dim': '#9fcc0a',
          violet: '#8b5cf6',
          'violet-deep': '#5b21b6',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out forwards',
        'fade-up-delay-1': 'fade-up 0.6s ease-out 0.08s forwards',
        'fade-up-delay-2': 'fade-up 0.6s ease-out 0.16s forwards',
        'fade-up-delay-3': 'fade-up 0.6s ease-out 0.24s forwards',
        shimmer: 'shimmer 8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
