/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{tsx,ts}", "./components/**/*.{tsx,ts}"],
  theme: {
    extend: {
      aspectRatio: {
        "9/16" : "9 / 16",
        "3/4" : "3 / 4",
      }
    },
  },
  plugins: [],
}
