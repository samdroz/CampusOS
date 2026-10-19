/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        app: 'var(--bg-app)',
        surface: {
          DEFAULT: 'var(--bg-surface)',
          elevated: 'var(--bg-surface-elevated)',
          hover: 'var(--bg-surface-hover)',
        },
        input: 'var(--bg-input)',
        border: {
          subtle: 'var(--border-subtle)',
          DEFAULT: 'var(--border-default)',
          focus: 'var(--border-focus)',
        },
        txt: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          hover: 'var(--accent-hover)',
          subtle: 'var(--accent-subtle)',
          text: 'var(--accent-text)',
        },
        semantic: {
          success: 'var(--success)',
          'success-subtle': 'var(--success-subtle)',
          warning: 'var(--warning)',
          'warning-subtle': 'var(--warning-subtle)',
          danger: 'var(--danger)',
          'danger-subtle': 'var(--danger-subtle)',
        },
        // Keep campus legacy palette mapped smoothly to prevent broken styles
        campus: {
          950: 'var(--bg-app)',
          900: 'var(--bg-app)',
          850: 'var(--bg-surface)',
          800: 'var(--bg-surface-elevated)',
          750: 'var(--bg-surface-hover)',
          700: 'var(--border-subtle)',
          600: 'var(--border-default)',
        },
        brand: {
          indigo: 'var(--accent-primary)',
          violet: '#8B5CF6',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          emerald: 'var(--success)',
          amber: 'var(--warning)',
          rose: 'var(--danger)',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'monospace',
        ],
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(2px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.15s ease-out',
        scaleIn: 'scaleIn 0.12s ease-out',
      },
    },
  },
  plugins: [],
}
