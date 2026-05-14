import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        line: "#d7ded8",
        paper: "#faf8f3",
        moss: "#486457",
        clay: "#a15d4f",
        honey: "#d59e45"
      },
      boxShadow: {
        soft: "0 12px 35px rgba(31, 41, 51, 0.10)"
      }
    }
  },
  plugins: []
};

export default config;
