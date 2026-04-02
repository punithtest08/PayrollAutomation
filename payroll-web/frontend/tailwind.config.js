/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: "#2563EB", dark: "#1D4ED8", light: "#3B82F6" },
        accent:  "#10B981",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0", transform: "translateY(8px)" },  to: { opacity: "1", transform: "translateY(0)" } },
        slideIn: { from: { opacity: "0", transform: "translateX(-8px)" }, to: { opacity: "1", transform: "translateX(0)" } },
      },
      animation: {
        fadeIn:  "fadeIn 0.15s ease",
        slideIn: "slideIn 0.2s ease",
      },
    },
  },
  plugins: [],
};
