import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      colors: {
        // shadcn/ui tokens (HSL via CSS vars — globals.css에서 정의)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },

        // stitch "Executive Command" 팔레트 (직접 hex 사용 토큰)
        surface: {
          DEFAULT: "#0b1326",
          dim: "#0b1326",
          bright: "#31394d",
          "container-lowest": "#060e20",
          "container-low": "#131b2e",
          container: "#171f33",
          "container-high": "#222a3d",
          "container-highest": "#2d3449",
          variant: "#2d3449",
        },
        "on-surface": "#dae2fd",
        "on-surface-variant": "#c7c4d7",
        "inverse-surface": "#dae2fd",
        "inverse-on-surface": "#283044",
        "surface-tint": "#c0c1ff",

        "primary-electric": "#c0c1ff",
        "primary-container": "#8083ff",
        "on-primary": "#1000a9",
        "on-primary-container": "#0d0096",
        "inverse-primary": "#494bd6",

        "secondary-slate": "#b9c8de",
        "on-secondary": "#233143",
        "secondary-container": "#39485a",
        "on-secondary-container": "#a7b6cc",

        "tertiary-sky": "#7bd0ff",
        "on-tertiary": "#00354a",
        "tertiary-container": "#009bd1",
        "on-tertiary-container": "#002d40",

        "error-soft": "#ffb4ab",
        "on-error": "#690005",
        "error-container": "#93000a",
        "on-error-container": "#ffdad6",

        outline: "#908fa0",
        "outline-variant": "#464554",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
      },
      fontSize: {
        "display-xl": ["48px", { lineHeight: "1.1", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg": ["30px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "600" }],
        "headline-md": ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        "body-lg": ["18px", { lineHeight: "1.6", fontWeight: "400" }],
        "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
        "data-tabular": ["14px", { lineHeight: "1.4", letterSpacing: "0.01em", fontWeight: "500" }],
        "label-sm": ["12px", { lineHeight: "1", letterSpacing: "0.05em", fontWeight: "600" }],
      },
      spacing: {
        "unit": "8px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
        "gutter": "24px",
        "container-padding": "32px",
      },
      borderRadius: {
        sm: "0.25rem",
        DEFAULT: "0.5rem",
        md: "0.75rem",
        lg: "1rem",
        xl: "1.5rem",
      },
      boxShadow: {
        "rim-light": "inset 0 1px 0 0 rgba(255, 255, 255, 0.10)",
        "indigo-glow": "0 0 20px -5px rgba(192, 193, 255, 0.15)",
        "indigo-glow-strong": "0 0 28px -4px rgba(192, 193, 255, 0.35)",
      },
      backdropBlur: {
        glass: "12px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        scanline: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100vh)" },
        },
        "pulse-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 15px rgba(99, 102, 241, 0.6))" },
          "50%": { filter: "drop-shadow(0 0 30px rgba(99, 102, 241, 0.9))" },
        },
        "rotate-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "rotate-reverse-slow": {
          "0%": { transform: "rotate(360deg)" },
          "100%": { transform: "rotate(0deg)" },
        },
        "float-particle": {
          "0%, 100%": { transform: "translate(0, 0) scale(1)", opacity: "0.3" },
          "50%": { transform: "translate(15px, -15px) scale(1.2)", opacity: "0.7" },
        },
        "reveal-up": {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        scanline: "scanline 8s linear infinite",
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        "rotate-slow": "rotate-slow 20s linear infinite",
        "rotate-reverse-slow": "rotate-reverse-slow 25s linear infinite",
        "float-particle": "float-particle 4s ease-in-out infinite",
        "reveal-up": "reveal-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
