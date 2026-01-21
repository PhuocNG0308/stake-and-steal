/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // 🏰 Royal Blue - Main UI & Bottom Nav
        'royal-blue': {
          DEFAULT: '#1e3a8a',
          light: '#2563eb', // Lightened for highlights
          dark: '#172554',  // Darkened for shadows
          900: '#172554', // Explicit 900 for compatibility if needed
        },
        // 🟢 Action Green - Play/Staking Buttons
        'action-green': {
          DEFAULT: '#4ade80',
          light: '#86efac',
          dark: '#16a34a',
        },
        // 🟡 Reward Gold - Coins & Secondary
        'reward-gold': {
          DEFAULT: '#f59e0b',
          light: '#fcd34d',
          dark: '#b45309',
        },
        // 🍦 Surface Cream - HUD Pills
        'surface-cream': {
          DEFAULT: '#fdfbf7',
          dim: '#f3f0e9',
        },
        // Legacy colors kept for critical errors only
        danger: '#ef4444',
      },
      fontFamily: {
        game: ['"Nunito"', 'sans-serif'],
        sans: ['"Nunito"', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'royal': '1.5rem',
        'chunky': '2rem',
        'mega': '2.5rem',
      },
      boxShadow: {
        'glossy': 'inset 0 2px 4px 0 rgba(255, 255, 255, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.2)',
        'glossy-sm': 'inset 0 1px 2px 0 rgba(255, 255, 255, 0.3), 0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        'pill': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.05), 0 2px 4px 0 rgba(0, 0, 0, 0.1)',
        'deep': '0 8px 0 0 rgba(0,0,0,0.2)',
        'royal': '0 6px 0 rgba(0, 0, 0, 0.2)',
      },
      animation: {
        'pulse-royal': 'pulse-royal 2s ease-in-out infinite',
        'bounce-soft': 'bounce-soft 1s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-royal': {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.05)', opacity: '0.9' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-15px)' },
        },
      },
    },
  },
  plugins: [],
}
