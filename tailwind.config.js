/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.js" // PromptStudioCanvas.js için
  ],
  darkMode: 'class',
  theme: {
    extend: {},
  },
  plugins: [],
}
