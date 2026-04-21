/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'ig-primary': '#0095f6',
        'ig-muted': '#8e8e8e',
        'ig-border': '#dbdbdb',
        'ig-bg': '#fafafa',
      },
    },
  },
  plugins: [],
}
