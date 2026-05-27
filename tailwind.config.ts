import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#F7F5EF",
        panel: "#FFFFFF",
        ink: "#1F2523",
        muted: "#6C736F",
        line: "#D8D4C8",
        rail: "#28322E",
        accent: "#0F766E",
        "accent-strong": "#0B5F59",
        warning: "#B7791F",
        danger: "#B42318",
        success: "#2F7D32",
        info: "#2F5E9E"
      }
    }
  },
  plugins: []
};

export default config;
