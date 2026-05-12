import type { Config } from "tailwindcss";

/**
 * Nexus ERP — v2 Design Tokens (Editorial / 금융지)
 *
 * 핵심:
 * - Champagne gold accent (#F5C26B) — 돈/품격
 * - Editorial serif (Instrument Serif) + Pretendard sans + JetBrains Mono
 * - Sharp borders, no rounding (8px grid 의 절제된 라인)
 * - 다크 배경 #08090B
 */
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

        // ★ v2 Editorial 팔레트 (직접 hex)
        bg: {
          DEFAULT: "#08090B",
          1: "#0E1014",
          2: "#14171C",
          3: "#1C2027",
          4: "#242932",
        },
        line: {
          DEFAULT: "#232830",
          2: "#2E343E",
          3: "#3A4150",
        },
        text: {
          1: "#EDEEF0",
          2: "#9098A6",
          3: "#5A6170",
          4: "#3A4150",
        },
        gold: {
          DEFAULT: "#F5C26B", // accent
          2: "#FFD27E",        // accent-2 (hover)
          soft: "#C99A4A",     // accent-soft (border)
          deep: "#8C6428",     // accent-deep
        },
        // v1 호환 유지 — 기존 컴포넌트가 참조하는 토큰들 (점진적 마이그레이션용)
        // 새 디자인에서는 위 bg/line/text/gold 사용 권장
        surface: {
          DEFAULT: "#08090B",
          dim: "#08090B",
          bright: "#242932",
          "container-lowest": "#08090B",
          "container-low": "#0E1014",
          container: "#14171C",
          "container-high": "#1C2027",
          "container-highest": "#242932",
          variant: "#242932",
        },
        "on-surface": "#EDEEF0",
        "on-surface-variant": "#9098A6",
        "primary-electric": "#F5C26B", // v1 의 indigo → v2 의 champagne 로 매핑
        "primary-container": "#FFD27E",
        "on-primary": "#0A0A0A",
        "on-primary-container": "#0A0A0A",
        "secondary-slate": "#8FB6E6",
        "tertiary-sky": "#8FB6E6",
        "on-tertiary": "#0A0A0A",
        "tertiary-container": "#4C6FA0",
        "tertiary": "#8FB6E6",
        "error-soft": "#E06B5F",
        outline: "#5A6170",
        "outline-variant": "#2E343E",
      },
      fontFamily: {
        // Pretendard 가 한국어 본문, Instrument Serif 가 에디토리얼 헤드라인, JetBrains Mono 가 메타/숫자
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "sans-serif",
        ],
        serif: [
          "var(--font-serif)",
          "Instrument Serif",
          "Pretendard Variable",
          "serif",
        ],
        mono: [
          "var(--font-mono)",
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      fontSize: {
        // v2 에디토리얼 스케일
        "display-xl": ["clamp(48px, 5vw, 76px)", { lineHeight: "0.98", letterSpacing: "-0.025em", fontWeight: "400" }],
        "headline-lg": ["56px", { lineHeight: "1", letterSpacing: "-0.025em", fontWeight: "400" }],
        "headline-md": ["24px", { lineHeight: "1.2", letterSpacing: "-0.015em", fontWeight: "400" }],
        "body-lg": ["16px", { lineHeight: "1.65", fontWeight: "400" }],
        "body-md": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
        "data-tabular": ["13px", { lineHeight: "1.4", letterSpacing: "0", fontWeight: "400" }],
        "label-sm": ["11px", { lineHeight: "1.2", letterSpacing: "0.08em", fontWeight: "400" }],
        "label-xs": ["10px", { lineHeight: "1.2", letterSpacing: "0.15em", fontWeight: "400" }],
        "label-xxs": ["9px", { lineHeight: "1.2", letterSpacing: "0.16em", fontWeight: "400" }],
      },
      spacing: {
        unit: "8px",
        "stack-sm": "8px",
        "stack-md": "16px",
        "stack-lg": "32px",
        gutter: "24px",
        "container-padding": "32px",
      },
      borderRadius: {
        // v2 는 sharp — 거의 radius 없음
        none: "0",
        sm: "0",
        DEFAULT: "0",
        md: "0",
        lg: "0",
        xl: "0",
        full: "9999px", // 아바타·도트만
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
        "view-in": {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "gold-pulse": {
          "50%": { opacity: "0.5" },
        },
        "modal-in": {
          from: { opacity: "0", transform: "translateY(20px) scale(.98)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "view-in": "view-in 0.45s cubic-bezier(.2,.7,.2,1)",
        "gold-pulse": "gold-pulse 2s ease-in-out infinite",
        "modal-in": "modal-in 0.35s cubic-bezier(.2,.7,.2,1)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
