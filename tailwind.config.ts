import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#E0E5EC",
        panel: "#E0E5EC",
        ink: "#3D4852",
        muted: "#6B7280",
        line: "transparent",
        rail: "#E0E5EC",
        accent: "#6C63FF",
        "accent-strong": "#8B84FF",
        warning: "#F59E0B",
        danger: "#B42318",
        success: "#0A7A3D",
        info: "#38B2AC"
      }
    }
  },
  plugins: []
};

export default config;
