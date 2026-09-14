import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          soft: "var(--color-primary-soft)",
        },
        surface: {
          DEFAULT: "var(--color-surface)",
          muted: "var(--color-surface-muted)",
        },
      },
      fontFamily: {
        sans: ["Pretendard", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "20px",
      },
    },
    fontWeight: {
      normal: "400",
      medium: "400",
      semibold: "600",
      bold: "600",
      extrabold: "600",
      black: "600",
    },
  },
  plugins: [],
};

export default config;
