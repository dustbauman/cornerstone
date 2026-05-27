import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: "#1B2A4A",
          light: "#243660",
          dark: "#131f37",
        },
        gold: {
          DEFAULT: "#C9A84C",
          light: "#d9bc74",
          dark: "#a8893a",
        },
        stone: "#F8F6F1",
        trust: "#2D6A4F",
        muted: "#6B7280",
      },
      fontFamily: {
        serif: ["Cormorant Garamond", "Georgia", "serif"],
        sans: ["DM Sans", "system-ui", "sans-serif"],
      },
      fontWeight: {
        bold: "600",
      },
    },
  },
  plugins: [],
};
export default config;
