/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        arcade: {
          bg: "#07080C",
          surface: "#0E1016",
          surface2: "#141720",
          border: "rgba(255,255,255,0.08)",
          green: "#35D07F",
          purple: "#8C5CF5",
          blue: "#4B8BFF",
          text: "#E9EAEE",
          muted: "#8A8F9C",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Space Grotesk", "Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 24px -4px rgba(53, 208, 127, 0.35)",
        "glow-purple": "0 0 24px -4px rgba(140, 92, 245, 0.35)",
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 30px -12px rgba(0,0,0,0.6)",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
