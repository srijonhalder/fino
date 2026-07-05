/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark background layers
        dark: {
          950: '#05070D',
          900: '#0B0F1A',
          800: '#111827',
          700: '#1A2235',
          600: '#1E2A45',
        },
        // Primary neon gradient stops (teal/emerald — matches landing design system)
        primary: {
          50:  '#eafbf5',
          100: '#cdf5e6',
          200: '#9aebd0',
          300: '#63dcb8',
          400: '#3ccc9f',
          500: '#22D3A5',
          600: '#1ab68e',
          700: '#159274',
          800: '#11745d',
          900: '#0e5c4a',
        },
        // Cyan accent
        cyan: {
          400: '#22d3ee',
          500: '#22D3EE',
          600: '#0fb8d1',
        },
        // Neon teal accent
        teal: {
          400: '#34D399',
          500: '#1fbd85',
          600: '#17a173',
        },
        // Legacy alias (keeps old code working)
        accent: {
          50:  '#eefdf6',
          100: '#d3fae6',
          200: '#a7f3cd',
          300: '#6ee7ad',
          400: '#34D399',
          500: '#1fbd85',
          600: '#17a173',
          700: '#12805d',
          800: '#0f654b',
          900: '#0d523d',
        },
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        heading: ['"JetBrains Mono"', 'monospace'],
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':  'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'hero-gradient':   'linear-gradient(135deg, #0B0F1A 0%, #111827 50%, #0B0F1A 100%)',
        'neon-gradient':   'linear-gradient(135deg, #22D3A5 0%, #22D3EE 100%)',
        'glass':           'linear-gradient(135deg, rgba(255,255,255,0.07), rgba(255,255,255,0.02))',
      },
      boxShadow: {
        'neon':        '0 0 20px rgba(34,211,165,0.4), 0 0 40px rgba(34,211,165,0.1)',
        'neon-cyan':   '0 0 20px rgba(34,211,238,0.4), 0 0 40px rgba(34,211,238,0.1)',
        'neon-teal':   '0 0 20px rgba(52,211,153,0.4)',
        'glass':       '0 8px 32px rgba(0,0,0,0.4)',
        'card':        '0 4px 24px rgba(0,0,0,0.3)',
        'card-hover':  '0 8px 40px rgba(34,211,165,0.25)',
        'glow-sm':     '0 0 8px rgba(34,211,165,0.5)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      },
      animation: {
        'float':     'float 6s ease-in-out infinite',
        'pulse-glow':'pulse-glow 2s ease-in-out infinite',
        'fade-up':   'fade-up 0.6s ease-out',
        'slide-in':  'slide-in 0.5s ease-out',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':       { transform: 'translateY(-20px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124,77,255,0.4)' },
          '50%':       { boxShadow: '0 0 40px rgba(124,77,255,0.8)' },
        },
        'fade-up': {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%':   { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
    },
  },
  plugins: [],
};
