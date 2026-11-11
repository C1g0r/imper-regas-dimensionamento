/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: '#123B66',
        brand: '#1677C8',
        sky: '#36A9D6',
        mist: '#F1F5F9',
        line: '#d9e3ee',
        ink: '#17324d',
        mut: '#5d7389',
        ok: '#1d9a5b',
        warn: '#d98a00',
        bad: '#cf3b3b',
      },
      fontFamily: { sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'] },
    },
  },
  plugins: [],
}
