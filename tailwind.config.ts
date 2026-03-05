import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/app/**/*.{ts,tsx}', './src/components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#080808',
        surface: '#0F0F0F',
        'surface-2': '#161616',
        'surface-3': '#1C1C1C',
        border: 'rgba(255,255,255,0.07)',
        'border-strong': 'rgba(255,255,255,0.12)',
        text: '#F2F2F2',
        muted: '#6B7280',
        accent: '#16A34A',
        'accent-light': '#22C55E',
        'accent-dark': '#15803D',
        'accent-glow': 'rgba(22,163,74,0.15)',
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#3B82F6',
        fence: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#2563eb',
          600: '#1d4ed8',
          700: '#1e3a5f',
          800: '#172e4a',
          900: '#0f1f33',
          950: '#0a1628',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 20px rgba(22,163,74,0.2)' },
          '50%': { boxShadow: '0 0 40px rgba(22,163,74,0.4)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease forwards',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
export default config
