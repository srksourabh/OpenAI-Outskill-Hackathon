import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#008FFF",
        panel: "#FFFFFF",
        ink: "#111111",
        muted: "#424242",
        line: "#008FFF",
        rail: "#FFFFFF",
        accent: "#FFE400",
        "accent-strong": "#F4D800",
        warning: "#FFE400",
        danger: "#B42318",
        success: "#0A7A3D",
        info: "#008FFF"
      }
    }
  },
  plugins: []
};

export default config;
