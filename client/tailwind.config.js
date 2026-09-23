/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        dept: {
          mail: '#10b981',
          regular: '#3b82f6',
          heavy: '#f59e0b',
          insurance: '#ec4899',
        },
      },
    },
  },
  plugins: [],
};
