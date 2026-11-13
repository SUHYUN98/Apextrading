/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: {
          light: '#FBFBFD',
          dark: '#0A0A0A',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#111111',
        },
        subtle: {
          light: '#F5F5F7',
          dark: '#161616',
        },
        border: {
          light: '#E5E7EB',
          dark: '#262626',
        },
        accent: {
          DEFAULT: '#0071E3',
          hover: '#0077ED',
          muted: '#E8F0FE',
        },
        bullish: {
          DEFAULT: '#34C759',
          muted: '#E8F8ED',
          dark: '#1A7331',
        },
        bearish: {
          DEFAULT: '#FF3B30',
          muted: '#FDECEB',
          dark: '#A51E1E',
        },
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', '-apple-system', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-in-right': 'slideInRight 0.25s ease-out',
        'slide-in-left': 'slideInLeft 0.25s ease-out',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInLeft: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
      },
    },
  },
  plugins: [],
};
