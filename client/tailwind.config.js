/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Plus Jakarta Sans', 'sans-serif'],
      },
      colors: {
        fauget: {
          bg: '#F5F2EB',
          card: '#FFFFFF',
          teal: '#0E6973',
          tealDark: '#072832',
          tealLight: '#208B99',
          accent: '#7DC5C0',
          textDark: '#122023',
          textMuted: '#586A70'
        },
        studio: {
          bg: '#000000',
          card: '#111111',
          green: '#00FF41',
          greenHover: '#10E548',
          textLight: '#FFFFFF',
          textMuted: '#9CA3AF',
          border: '#27272A'
        }
      }
    },
  },
  plugins: [],
}
