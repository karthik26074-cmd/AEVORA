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
        brand: {
          primary: '#7668F5',
          'primary-hover': '#6556EB',
          'primary-light': '#F0EFFF',
          navy: '#181A2B',
          dark: '#181A2B',
          'dark-card': '#202337',
          'dark-border': '#2E324E',
          bg: '#F7F8FC',
          surface: '#FFFFFF',
          text: '#24263A',
          secondary: '#85899A',
          border: '#E4E7F0',
          success: '#1C9B78',
          'success-light': '#E8F7F3',
          warning: '#D99B43',
          'warning-light': '#FDF6EA',
          error: '#D85F6C',
          'error-light': '#FDF0F1',
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(24, 26, 43, 0.04), 0 1px 2px -1px rgba(24, 26, 43, 0.03)',
        'card': '0 2px 8px -2px rgba(24, 26, 43, 0.06), 0 1px 4px -1px rgba(24, 26, 43, 0.04)',
        'elevated': '0 12px 30px -6px rgba(24, 26, 43, 0.09), 0 8px 12px -6px rgba(24, 26, 43, 0.05)',
        'glow-primary': '0 0 20px -3px rgba(118, 104, 245, 0.35)',
        'glow-success': '0 0 20px -3px rgba(28, 155, 120, 0.35)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        floatSubtle: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.06)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'scale-in': 'scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float': 'floatSubtle 3s ease-in-out infinite',
        'glow': 'glowPulse 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite linear',
      },
    },
  },
  plugins: [],
}
