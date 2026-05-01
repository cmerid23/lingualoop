import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F0F9FF",
          100: "#E0F2FE",
          200: "#BAE6FD",
          300: "#7DD3FC",
          400: "#38BDF8",
          500: "#0EA5E9",
          600: "#0284C7",
          700: "#0369A1",
          800: "#075985",
          900: "#0C4A6E",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        // Geʽez script (Amharic / Tigrinya) needs explicit font fallbacks
        // for consistent rendering across iOS/Android.
        geez: [
          "Noto Sans Ethiopic",
          "Abyssinica SIL",
          "Nyala",
          "Kefa",
          "sans-serif",
        ],
        arabic: ["Noto Naskh Arabic", "Scheherazade New", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
