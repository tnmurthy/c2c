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
        // Deep Space Palette
        background: "#0e1416",
        surface: {
          DEFAULT: "#0e1416",
          dim: "#0e1416",
          bright: "#343a3c",
          container: {
            lowest: "#090f11",
            low: "#161d1e",
            DEFAULT: "#1a2122",
            high: "#242b2d",
            highest: "#2f3638",
          }
        },
        primary: {
          DEFAULT: "#8aebff", // Cyan 400ish
          dark: "#00363e",
          container: "#22d3ee",
        },
        secondary: {
          DEFAULT: "#c3c0ff", // Indigo light
          dark: "#3626ce",
          container: "#e2dfff",
        },
        tertiary: {
          DEFAULT: "#ffd6a3", // Gold/Orange
          dark: "#462b00",
        },
        slate: {
          950: "#0e1416",
          900: "#1a2122",
          800: "#242b2d",
        }
      },
      fontFamily: {
        sans: ["var(--font-hanken)", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "cyber-grid": "linear-gradient(to right, #1e293b 1px, transparent 1px), linear-gradient(to bottom, #1e293b 1px, transparent 1px)",
      },
      boxShadow: {
        "cyan-glow": "0 0 15px rgba(138, 235, 255, 0.3)",
        "cyan-glow-strong": "0 0 25px rgba(138, 235, 255, 0.5)",
        "indigo-glow": "0 0 15px rgba(195, 192, 255, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scanline": "scanline 8s linear infinite",
        "float": "float 6s ease-in-out infinite",
      },
      keyframes: {
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        }
      }
    },
  },
  plugins: [],
};
export default config;
