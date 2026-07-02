import type { Config } from "tailwindcss";

/**
 * Tailwind 는 /admin 운영 콘솔 전용이다.
 *
 * 누수 방지 전략:
 *  1) content 를 admin 화면·shadcn 컴포넌트로만 한정 → 공개 화면 클래스는
 *     유틸을 생성하지 않는다.
 *  2) preflight(전역 리셋) 비활성화 → Tailwind base 리셋이 공개 화면
 *     (손수 작성 CSS)에 스며들지 않는다.
 *  3) darkMode class (admin 은 라이트 고정, 다크 클래스 미사용).
 */
const config: Config = {
  darkMode: ["class"],
  corePlugins: {
    preflight: false,
  },
  content: [
    "./app/admin/**/*.{ts,tsx}",
    "./components/admin/**/*.{ts,tsx}",
    "./components/ui/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
