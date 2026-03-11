/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        base: "#0b0b0b",
        panel: "#1a1a1a",
        accent: "#4f7cff"
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(79,124,255,0.2), 0 10px 30px rgba(79,124,255,0.15)"
      },
      borderRadius: {
        xl: "18px"
      }
    }
  },
  plugins: []
};
