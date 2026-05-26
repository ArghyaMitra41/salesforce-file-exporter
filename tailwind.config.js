/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        sf: {
          blue: '#0176d3',
          'blue-dark': '#014486',
          'blue-light': '#1b96ff',
          'blue-bg': '#f3f8ff',
          teal: '#0b827c',
          green: '#2e844a',
          red: '#ba0517',
          orange: '#dd7a01',
          purple: '#5a2eb3',
        },
      },
    },
  },
  plugins: [],
}


