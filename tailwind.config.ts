import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: "#0A0A0F",
          2: "#1A1A2E",
          3: "#2D2D4E",
        },
        surface: {
          DEFAULT: "#F5F3EE",
          2: "#ECEAE3",
          3: "#E0DDD4",
        },
        gold: {
          DEFAULT: "#C8973A",
          light: "#F0C96B",
          pale: "#FBF3E0",
        },
        teal: {
          DEFAULT: "#2EC4B6",
          dark: "#1A9E92",
        },
        coral: "#FF6B6B",
        violet: {
          DEFAULT: "#7C3AED",
          light: "#9F5FE8",
        },
        // Keep `brand` aliased to gold so anything not yet refactored still renders cleanly.
        brand: {
          50: "#FBF3E0",
          100: "#F5E5BC",
          200: "#F0C96B",
          300: "#E5B547",
          400: "#D6A23F",
          500: "#C8973A",
          600: "#A87D2D",
          700: "#876122",
          800: "#664818",
          900: "#43300F",
        },
      },
      fontFamily: {
        // Sora drives body copy; Clash Display drives headings/numbers.
        sans: [
          "Sora",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        display: [
          "Clash Display",
          "Sora",
          "system-ui",
          "sans-serif",
        ],
        // Geʽez script (Amharic / Tigrinya).
        geez: [
          "Noto Sans Ethiopic",
          "Abyssinica SIL",
          "Nyala",
          "Kefa",
          "sans-serif",
        ],
        arabic: ["Noto Naskh Arabic", "Scheherazade New", "Arial", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "20px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "28px",
        "3xl": "32px",
      },
      boxShadow: {
        soft: "0 4px 24px rgba(10,10,15,0.08)",
        lift: "0 12px 48px rgba(10,10,15,0.14)",
        gold: "0 6px 24px rgba(200,151,58,0.4)",
        teal: "0 8px 24px rgba(46,196,182,0.35)",
        violet: "0 8px 24px rgba(124,58,237,0.4)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "pop-in": {
          from: { transform: "scale(0.7)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "screen-in": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          from: { transform: "scale(0.3)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(46,196,182,0.5)" },
          "70%": { boxShadow: "0 0 0 20px rgba(46,196,182,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(46,196,182,0)" },
        },
        typing: {
          "0%, 100%": { transform: "translateY(0)", opacity: "0.5" },
          "50%": { transform: "translateY(-4px)", opacity: "1" },
        },
        "confetti-fall": {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(110vh) rotate(720deg)", opacity: "0" },
        },
      },
      animation: {
        float: "float 3s ease-in-out infinite",
        "pop-in": "pop-in 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "screen-in": "screen-in 0.35s ease",
        "bounce-in": "bounce-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "pulse-ring": "pulse-ring 1.2s ease-out infinite",
        typing: "typing 1.2s infinite",
        // Default 3s duration — pieces override with their own duration inline
        "confetti-fall": "confetti-fall 3s linear forwards",
      },
    },
  },
  plugins: [],
} satisfies Config;
