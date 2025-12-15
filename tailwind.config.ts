import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx}",
    "./src/components/**/*.{js,ts,jsx,tsx}",

    // (안전망, 나중에 구조 바뀌어도 대비)
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "rgb(var(--bg) / <alpha-value>)",
        fg: "rgb(var(--fg) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        border: "rgb(var(--border) / <alpha-value>)",
        brand: "rgb(var(--brand) / <alpha-value>)",
        "brand-weak": "rgb(var(--brand-weak) / <alpha-value>)",
      },
      borderRadius: { xl: "16px", "2xl": "20px" },
      boxShadow: { soft: "0 8px 24px rgba(0,0,0,.08)" },
    },
  },
  plugins: [],
};

export default config;
