import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#e8f4fd', 100: '#c5e3f9', 200: '#8ec8f3', 300: '#57adec',
          400: '#2d92d9', 500: '#1a6fb5', 600: '#155d98', 700: '#104b7b',
          800: '#0c3a5f', 900: '#082a45', 950: '#051a2d',
        },
        accent: {
          50: '#f0faf0', 100: '#d4f0d4', 200: '#a8e0a8', 300: '#7ccf7c',
          400: '#5cb85c', 500: '#4caa4c', 600: '#3d8b3d', 700: '#2e6c2e',
        },
        surface: { DEFAULT: '#ffffff', dim: '#f8fafc', dark: '#0f1629', 'dark-dim': '#1a2332' },
      },
      fontFamily: {
        sans: ['DM Sans', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        display: ['Comfortaa', 'DM Sans', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'SF Mono', 'monospace'],
      },
      boxShadow: {
        'glass': '0 8px 32px rgba(0,0,0,0.06)',
        'glass-lg': '0 16px 48px rgba(0,0,0,0.08)',
        'glass-hover': '0 16px 48px rgba(0,0,0,0.12)',
        'glow-brand': '0 0 20px rgba(26,111,181,0.3)',
        'glow-accent': '0 0 20px rgba(92,184,92,0.3)',
        'inner-light': 'inset 0 1px 0 rgba(255,255,255,0.1)',
      },
      borderRadius: { '4xl': '2rem' },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'fade-in-down': 'fadeInDown 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'shimmer': 'shimmer 1.5s infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        fadeInUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        fadeInDown: { from: { opacity: '0', transform: 'translateY(-8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
        slideInRight: { from: { opacity: '0', transform: 'translateX(-12px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        pulseSoft: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0.6' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        glow: { from: { boxShadow: '0 0 12px rgba(26,111,181,0.2)' }, to: { boxShadow: '0 0 24px rgba(26,111,181,0.4)' } },
      },
    },
  },
  plugins: [],
};

export default config;
