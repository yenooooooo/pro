"use client";

import { useEffect, useState } from "react";

/**
 * v2 Pulse Sweep — 골드 가로선이 화면을 위→아래로 흐름.
 *
 * 사용:
 *  - window.dispatchEvent(new CustomEvent("nexus:pulse-sweep"))
 *  - 또는 TopBar 의 System Pulse 버튼 (⊙) 클릭
 */
export function PulseSweep() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function trigger() {
      setActive(true);
      setTimeout(() => setActive(false), 1200);
    }
    window.addEventListener("nexus:pulse-sweep", trigger as EventListener);
    return () =>
      window.removeEventListener("nexus:pulse-sweep", trigger as EventListener);
  }, []);

  if (!active) return null;

  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[90]"
        style={{
          animation: "pulseSweep 1.2s cubic-bezier(.2,.7,.2,1)",
        }}
      >
        <div
          className="absolute left-0 right-0 -top-2 h-1"
          style={{
            background:
              "linear-gradient(to right, transparent, #F5C26B, transparent)",
            boxShadow: "0 0 24px #F5C26B",
          }}
        />
      </div>
      <style jsx global>{`
        @keyframes pulseSweep {
          0% {
            opacity: 0;
            transform: translateY(-8px);
          }
          10% {
            opacity: 1;
          }
          100% {
            opacity: 0;
            transform: translateY(110vh);
          }
        }
      `}</style>
    </>
  );
}

/**
 * System Pulse 버튼 — TopBar 에 배치.
 * 클릭하면 PulseSweep 트리거 + 토스트.
 */
export function SystemPulseButton() {
  function fire() {
    window.dispatchEvent(new CustomEvent("nexus:pulse-sweep"));
    // toast 도 함께 (sonner 가 있으면)
    import("sonner").then((m) => {
      m.toast("System Pulse · 200ms", {
        description: "전 시스템 정상 응답",
      });
    });
  }
  return (
    <button
      type="button"
      onClick={fire}
      title="System Pulse · P"
      aria-label="System Pulse"
      className="flex h-[34px] w-[34px] items-center justify-center border border-line text-gold transition-colors hover:border-gold-soft hover:bg-gold/[0.06]"
    >
      <span aria-hidden className="text-[16px]">
        ⊙
      </span>
    </button>
  );
}
