"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Mode = "system" | "light" | "dark";

const STORAGE_KEY = "theme-mode";

/**
 * 다크/라이트/시스템 3-mode 토글.
 *
 * 라이트 모드는 experimental — 디자인 토큰이 다크 전용으로 설계되어
 * 일부 영역(차트 색, 일부 glass-panel 효과)이 어색할 수 있음. README 명시.
 *
 * 동작:
 *  - localStorage 'theme-mode' 에 사용자 선택 저장
 *  - 'system' 이면 prefers-color-scheme 자동 따라가기
 *  - <html> 에 .dark / .light 클래스 적용
 */
export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    // 기본값은 'dark'. 라이트는 experimental 이라 사용자가 명시적으로 골라야만 적용.
    const saved = (localStorage.getItem(STORAGE_KEY) as Mode | null) ?? "dark";
    setMode(saved);
    apply(saved);

    if (saved === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: light)");
      const handler = () => apply("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, []);

  function change(next: Mode) {
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  return (
    <div
      role="group"
      aria-label="테마 전환 (라이트는 experimental)"
      className="hidden items-center gap-0.5 rounded-full border border-outline-variant/30 bg-surface-container/50 p-0.5 md:inline-flex"
      title="라이트 모드는 experimental — 일부 색상이 어색할 수 있습니다 (v1.1에서 풀 디자인)"
    >
      <Btn current={mode} value="light" onClick={() => change("light")}>
        <Sun aria-hidden className="h-3.5 w-3.5" />
      </Btn>
      <Btn current={mode} value="system" onClick={() => change("system")}>
        <Monitor aria-hidden className="h-3.5 w-3.5" />
      </Btn>
      <Btn current={mode} value="dark" onClick={() => change("dark")}>
        <Moon aria-hidden className="h-3.5 w-3.5" />
      </Btn>
    </div>
  );
}

function Btn({
  current,
  value,
  onClick,
  children,
}: {
  current: Mode;
  value: Mode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={
        value === "light" ? "라이트 모드" : value === "dark" ? "다크 모드" : "시스템 따라가기"
      }
      className={
        "inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors " +
        (active
          ? "bg-primary-electric text-on-primary"
          : "text-on-surface-variant hover:text-on-surface")
      }
    >
      {children}
    </button>
  );
}

function apply(mode: Mode) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  let actual: "light" | "dark";
  if (mode === "system") {
    actual = window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  } else {
    actual = mode;
  }
  html.classList.remove("light", "dark");
  html.classList.add(actual);
}
