/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F7F3EE',
        'paper-deep': '#EFE4D7',
        charcoal: '#2C2C2C',
        'shrine-red': '#C0392B',
        gold: '#D4AF37',
        mist: '#E9DED1',
        ink: '#4B4038',
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        serif: ['"Noto Serif JP"', 'serif'],
      },
      boxShadow: {
        slip: '0 24px 60px rgba(91, 59, 39, 0.18)',
        glow: '0 10px 30px rgba(192, 57, 43, 0.16)',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        drift: {
          '0%': { transform: 'translate3d(0, 0, 0)', opacity: '0.18' },
          '50%': { transform: 'translate3d(10px, -14px, 0)', opacity: '0.32' },
          '100%': { transform: 'translate3d(-6px, -28px, 0)', opacity: '0.12' },
        },
        'paper-draw': {
          '0%': {
            transform: 'translateY(3rem) scale(0.96)',
            opacity: '0',
          },
          '35%': {
            opacity: '1',
          },
          '100%': {
            transform: 'translateY(0) scale(1)',
            opacity: '1',
          },
        },
        'fade-up': {
          '0%': {
            transform: 'translateY(1rem)',
            opacity: '0',
          },
          '100%': {
            transform: 'translateY(0)',
            opacity: '1',
          },
        },
        'fold-away': {
          '0%': {
            transform: 'rotateX(0deg) scale(1)',
            opacity: '1',
          },
          '60%': {
            transform: 'rotateX(72deg) scale(0.96)',
            opacity: '0.7',
          },
          '100%': {
            transform: 'translateY(2rem) rotateX(84deg) scale(0.88)',
            opacity: '0',
          },
        },
        'pulse-soft': {
          '0%, 100%': {
            opacity: '0.8',
            transform: 'scale(1)',
          },
          '50%': {
            opacity: '1',
            transform: 'scale(1.04)',
          },
        },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        drift: 'drift 10s ease-in-out infinite',
        'paper-draw': 'paper-draw 900ms cubic-bezier(0.2, 1, 0.25, 1) both',
        'fade-up': 'fade-up 700ms ease-out both',
        'fold-away': 'fold-away 800ms ease-in forwards',
        'pulse-soft': 'pulse-soft 2.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
