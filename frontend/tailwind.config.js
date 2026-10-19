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
        campus: {
          950: '#06090F', // deep void background
          900: '#0B0F17', // main dark background
          850: '#101623', // card background
          800: '#161F30', // elevated card / panel
          750: '#1D283E', // hover state
          700: '#25334E', // subtle border
          600: '#384A6E',
          500: '#4F6594',
          400: '#7E92BA',
          300: '#A4B6D8',
          200: '#CBD6EB',
          100: '#E4ECF8',
          50: '#F4F7FC',
        },
        brand: {
          indigo: '#6366F1',
          violet: '#8B5CF6',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          emerald: '#10B981',
          amber: '#F59E0B',
          rose: '#F43F5E',
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
      boxShadow: {
        'glow-indigo': '0 0 20px -3px rgba(99, 102, 241, 0.25)',
        'glow-cyan': '0 0 20px -3px rgba(6, 182, 212, 0.25)',
        'glow-rose': '0 0 20px -3px rgba(244, 63, 94, 0.25)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-out',
        scaleIn: 'scaleIn 0.15s ease-out',
      },
    },
  },
  plugins: [],
}
