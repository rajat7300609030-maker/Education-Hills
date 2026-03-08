export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./index.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          light: 'var(--primary-light)',
        },
        // Map indigo to primary so existing components change
        indigo: {
          50: 'var(--primary-light)',
          600: 'var(--primary)',
          700: 'var(--primary-hover)',
        }
      },
      animation: {
        blob: "blob 7s infinite",
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'blink-rainbow': 'blinkRainbow 1.5s linear infinite',
        'bar-glow': 'barGlow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
        'pulse-subtle': 'pulseSubtle 2s ease-in-out infinite'
      },
      keyframes: {
        blob: {
          "0%": { transform: "translate(0px, 0px) scale(1)" },
          "33%": { transform: "translate(30px, -50px) scale(1.1)" },
          "66%": { transform: "translate(-20px, 20px) scale(0.9)" },
          "100%": { transform: "translate(0px, 0px) scale(1)" }
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' }
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' }
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(0.98)' }
        },
        blinkRainbow: {
          '0%': { borderColor: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' },
          '25%': { borderColor: '#f59e0b', boxShadow: '0 0 10px rgba(245, 158, 11, 0.4)' },
          '50%': { borderColor: '#10b981', boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)' },
          '75%': { borderColor: '#6366f1', boxShadow: '0 0 10px rgba(99, 102, 241, 0.4)' },
          '100%': { borderColor: '#ef4444', boxShadow: '0 0 10px rgba(239, 68, 68, 0.4)' }
        },
        barGlow: {
          '0%, 100%': { filter: 'brightness(1) saturate(1)', boxShadow: '0 0 2px currentColor' },
          '50%': { filter: 'brightness(1.3) saturate(1.2)', boxShadow: '0 0 12px currentColor' }
        }
      }
    },
  },
  plugins: [],
}
