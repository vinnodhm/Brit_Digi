import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy:      '#0D1B3E',   // deep navy — primary background
          'navy-light': '#152754',
          gold:      '#C9A84C',   // gold accent
          'gold-light': '#E2C47A',
          cream:     '#FDF8F0',   // warm cream — off-white
          charcoal:  '#1E293B',
          muted:     '#64748B',
          success:   '#10B981',
          danger:    '#EF4444',
          ink:       '#0F172A',
        },
      },
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'hero-gradient':    'linear-gradient(135deg, #0D1B3E 0%, #1a2f5e 50%, #0D1B3E 100%)',
        'gold-gradient':    'linear-gradient(90deg, #C9A84C 0%, #E2C47A 50%, #C9A84C 100%)',
        'card-gradient':    'linear-gradient(145deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        'section-gradient': 'linear-gradient(180deg, #0D1B3E 0%, #0a1628 100%)',
      },
      boxShadow: {
        'brand': '0 4px 24px rgba(201, 168, 76, 0.2)',
        'card':  '0 8px 32px rgba(0, 0, 0, 0.24)',
        'glow':  '0 0 40px rgba(201, 168, 76, 0.15)',
      },
      animation: {
        'fade-up':     'fadeUp 0.6s ease forwards',
        'fade-in':     'fadeIn 0.4s ease forwards',
        'shimmer':     'shimmer 2s linear infinite',
        'pulse-gold':  'pulseGold 2s cubic-bezier(0.4,0,0.6,1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        pulseGold: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201,168,76,0.4)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(201,168,76,0)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
