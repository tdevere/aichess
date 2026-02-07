/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#7FA650',
        secondary: '#312E2B',
        accent: '#FFD700'
      }
    },
  },
  plugins: [],
}
