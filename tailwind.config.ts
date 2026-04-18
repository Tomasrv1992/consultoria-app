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
        teal: {
          DEFAULT: "#0D7C5F",
          50: "#ECFDF5",
          100: "#D1FAE5",
          600: "#065F46",
          700: "#064E3B",
        },
        navy: "#1B3A5C",
        bg: "#FAFAFA",
        surface: "#FFFFFF",
        sidebar: "#111111",
        ink: "#111111",
        muted: "#6B7280",
        line: "#E5E7EB",
        chip: "#F3F4F6",
        chipink: "#374151",
        danger: "#DC2626",
      },
      fontFamily: {
        serif: ["DM Serif Display", "Georgia", "serif"],
        sans: [
          "Plus Jakarta Sans",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      borderRadius: {
        card: "8px",
        btn: "6px",
        chip: "4px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.08)",
      },
      letterSpacing: {
        label: "0.08em",
      },
    },
  },
  plugins: [],
};
export default config;
