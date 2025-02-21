/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./app/**/*.{js,ts,jsx,tsx}",
	"./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#6366F1",
        secondary: "#64748B",
        accent: "#D97706",
        background: "#F3F4F6",
        foreground: "#1F2937",
        border: "#E5E7EB"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};
