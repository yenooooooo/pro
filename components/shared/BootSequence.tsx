"use client";

import { useEffect, useState } from "react";

const BOOT_LOG = [
  { ok: true, label: "kernel", text: "Operations OS · v1.4.0" },
  { ok: true, label: "auth", text: "Supabase RLS · 4-tier verified" },
  { ok: true, label: "db", text: "Postgres · chongmu schema · 38 tables" },
  { ok: true, label: "i18n", text: "ko / en · cookie persisted" },
  { ok: true, label: "ai", text: "Gemini Vision · 2.5 Flash" },
  { ok: true, label: "ready", text: "Welcome." },
];

const STORAGE_KEY = "nexus-boot-seen";

/**
 * v2 Boot Sequence — 첫 로그인 / 첫 방문 시 NEXUS 로고 + 진행률 바 + 로그.
 *
 * - sessionStorage 'nexus-boot-seen' 으로 세션당 1회만 노출
 * - 약 3초 후 페이드 아웃
 * - body-scroll lock 효과
 */
export function BootSequence() {
  const [show, setShow] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<typeof BOOT_LOG>([]);
  const [now, setNow] = useState(new Date());
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 세션당 1회만
    const seen = sessionStorage.getItem(STORAGE_KEY);
    if (seen) return;
    sessionStorage.setItem(STORAGE_KEY, "1");
    setShow(true);

    // 클럭
    const clockId = setInterval(() => setNow(new Date()), 50);

    // 진행률 (3초 동안)
    const total = 100;
    const tick = 30; // ms
    const step = (total / 3000) * tick;
    let p = 0;
    const progId = setInterval(() => {
      p += step;
      setProgress(Math.min(100, p));
      if (p >= 100) clearInterval(progId);
    }, tick);

    // 로그 (500ms 간격으로 6줄)
    const logTimers: ReturnType<typeof setTimeout>[] = BOOT_LOG.map((line, i) =>
      setTimeout(() => {
        setLogs((arr) => [...arr, line]);
      }, 200 + i * 450),
    );

    // 페이드 아웃 + 제거
    const fadeId = setTimeout(() => setFading(true), 3200);
    const hideId = setTimeout(() => setShow(false), 3800);

    return () => {
      clearInterval(clockId);
      clearInterval(progId);
      logTimers.forEach(clearTimeout);
      clearTimeout(fadeId);
      clearTimeout(hideId);
    };
  }, []);

  if (!show) return null;

  const stamp = now.toLocaleTimeString("ko-KR", { hour12: false });
  const ms = String(now.getMilliseconds()).padStart(3, "0");

  return (
    <div
      role="status"
      aria-label="시스템 부팅 중"
      className={`fixed inset-0 z-[999] flex flex-col items-center justify-center gap-8 bg-[#050608] font-mono transition-opacity duration-700 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent 0, transparent 2px, rgba(245,194,107,0.02) 2px, rgba(245,194,107,0.02) 3px)",
      }}
    >
      {/* 네 모서리 */}
      <div className="absolute left-7 top-6 text-[10px] uppercase tracking-[0.15em] text-text-4">
        <b className="text-gold">NEXUS</b> · operations os
      </div>
      <div className="absolute right-7 top-6 text-[10px] uppercase tracking-[0.15em] text-text-4">
        v1.4.0 · build 26.05.11
      </div>
      <div className="absolute bottom-6 left-7 text-[10px] uppercase tracking-[0.15em] text-text-4">
        tenant · acme-corp
      </div>
      <div className="absolute bottom-6 right-7 text-[10px] uppercase tracking-[0.15em] text-text-4 tabular-nums">
        {stamp}.{ms}
      </div>

      {/* 큰 로고 */}
      <div className="relative font-serif text-[88px] leading-none tracking-[-0.04em] text-text-1">
        NE<em className="font-serif not-italic italic text-gold">X</em>US
        <span
          aria-hidden
          className="absolute -right-[18px] top-3 inline-block h-[56px] w-1 bg-gold"
          style={{
            animation: "boot-blink 0.6s steps(2) infinite",
          }}
        />
      </div>

      <div className="text-[11px] uppercase tracking-[0.24em] text-text-3">
        Operations OS · authenticating
      </div>

      {/* 진행률 바 */}
      <div className="relative h-px w-[320px] overflow-hidden bg-line">
        <div
          aria-hidden
          className="absolute inset-y-0 left-0 bg-gold transition-[width] duration-150 ease-linear"
          style={{
            width: `${progress}%`,
            boxShadow: "0 0 12px #F5C26B",
          }}
        />
      </div>

      {/* 로그 */}
      <div className="flex min-h-[120px] flex-col items-center gap-1 text-[11px] tracking-[0.06em] text-text-3">
        {logs.map((line, i) => (
          <div key={i} style={{ animation: "boot-line-in 0.3s" }}>
            <span className="mr-2 text-[#6BCB8A]">✓</span>
            <b className="mr-2 text-gold">[{line.label}]</b>
            <span className="text-text-2">{line.text}</span>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes boot-blink {
          0%,
          50% {
            opacity: 1;
          }
          51%,
          100% {
            opacity: 0;
          }
        }
        @keyframes boot-line-in {
          from {
            opacity: 0;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
