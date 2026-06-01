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
        charcoal: "#1A1A1A",
        warm: "#E5E0D5",
      },
      borderColor: {
        warm: "#E5E0D5",
      },
      boxShadow: {
        card: "0 1px 3px rgba(27, 42, 74, 0.06)",
        "card-hover": "0 4px 14px rgba(27, 42, 74, 0.08)",
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
