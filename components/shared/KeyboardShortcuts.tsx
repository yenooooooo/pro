"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Vim 스타일 키 시퀀스 단축키.
 *
 * g 누르고 1초 안에 다른 키 → 페이지 점프.
 *  - g d → /dashboard
 *  - g e → /employees
 *  - g a → /attendance
 *  - g p → /payroll
 *  - g l → /leave
 *  - g x → /expenses (eXpenses)
 *  - g v → /vendors
 *  - g s → /assets (Stuff)
 *  - g c → /closing
 *  - g r → /risks
 *  - g i → /simulator (sImulator)
 *  - g t → /retirement (reTirement)
 *  - g y → /year-end
 *  - g k → /calendar
 *  - g h → /audit-logs (History)
 *  - g f → /approvals (workFlow)
 *
 * input/textarea/contenteditable 안에서는 비활성.
 */
const ROUTES: Record<string, string> = {
  d: "/dashboard",
  e: "/employees",
  a: "/attendance",
  p: "/payroll",
  l: "/leave",
  x: "/expenses",
  v: "/vendors",
  s: "/assets",
  c: "/closing",
  r: "/risks",
  i: "/simulator",
  t: "/retirement",
  y: "/year-end",
  k: "/calendar",
  h: "/audit-logs",
  f: "/approvals",
};

export function KeyboardShortcuts() {
  const router = useRouter();
  const waitingRef = useRef(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    function isInForm(target: EventTarget | null): boolean {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (target.isContentEditable) return true;
      // 모달/팝업 안에서는 비활성
      if (target.closest("[role='dialog']")) return true;
      return false;
    }

    function onKey(e: KeyboardEvent) {
      // 단축키 자체가 활성화된 modifier 와 함께 눌리면 무시
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isInForm(e.target)) return;

      if (waitingRef.current) {
        const key = e.key.toLowerCase();
        const target = ROUTES[key];
        if (target) {
          e.preventDefault();
          router.push(target as never);
        }
        cancel();
        return;
      }

      if (e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        waitingRef.current = true;
        setShowHint(true);
        timerRef.current = setTimeout(cancel, 1500);
      }
    }

    function cancel() {
      waitingRef.current = false;
      setShowHint(false);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [router]);

  if (!showHint) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl border border-primary-electric/40 bg-surface-container/95 px-4 py-3 shadow-2xl backdrop-blur-md">
      <p className="mb-2 text-label-sm font-semibold uppercase tracking-widest text-primary-electric">
        다음 키를 누르세요…
      </p>
      <div className="grid grid-cols-4 gap-x-4 gap-y-1 text-label-sm">
        <Hint k="d" label="대시보드" />
        <Hint k="e" label="직원" />
        <Hint k="a" label="근태" />
        <Hint k="p" label="급여" />
        <Hint k="l" label="연차" />
        <Hint k="x" label="지출" />
        <Hint k="v" label="거래처" />
        <Hint k="s" label="자산" />
        <Hint k="c" label="결산" />
        <Hint k="f" label="결재" />
        <Hint k="r" label="리스크" />
        <Hint k="i" label="시뮬" />
        <Hint k="t" label="퇴직" />
        <Hint k="y" label="연말정산" />
        <Hint k="k" label="캘린더" />
        <Hint k="h" label="감사로그" />
      </div>
    </div>
  );
}

function Hint({ k, label }: { k: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-outline-variant/40 bg-surface-container-low px-1 font-mono text-[10px] font-bold text-on-surface">
        {k}
      </kbd>
      <span className="text-on-surface-variant">{label}</span>
    </div>
  );
}
