/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          400: '#004099',
          500: '#003380',
          // 700: '#00205b',
          700: '#0551A4',
        },
        accent: {
          400: '#ffcc66',
          500: '#ffbb33',
          600: '#F4B400',
        },
      },
    },
  },
  plugins: [],
};
