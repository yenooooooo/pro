"use client";

import { useEffect, useState } from "react";

/**
 * 슬라이딩 가로 ticker — 한 줄로 끝없이 흐르는 마키.
 * keyframes 사용 X (Tailwind v3 한계). CSS animation 직접 사용.
 */
export function HorizontalTicker({
  items,
  speed = 40,
  className = "",
  separator = "·",
}: {
  items: string[];
  speed?: number; // 픽셀/초
  className?: string;
  separator?: string;
}) {
  // 2배 반복으로 끊김 없는 루프
  const doubled = [...items, ...items];

  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden>
      <div
        className="flex shrink-0 gap-8 whitespace-nowrap"
        style={{
          animation: `marquee ${items.length * (100 / speed)}s linear infinite`,
        }}
      >
        {doubled.map((item, idx) => (
          <span key={idx} className="inline-flex items-center gap-8">
            <span>{item}</span>
            <span className="text-gold/40">{separator}</span>
          </span>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

/**
 * 라이브 상단 ticker — pulse dot + 회전 키워드.
 * 일정 주기로 한 항목씩 교체 fade.
 */
export function LiveStatusTicker({
  items,
  interval = 2500,
}: {
  items: Array<{ label: string; value: string; tone?: "gold" | "green" | "blue" | "red" }>;
  interval?: number;
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % items.length);
    }, interval);
    return () => clearInterval(id);
  }, [items.length, interval]);

  const cur = items[idx];
  const toneClass =
    cur.tone === "green"
      ? "text-[#6BCB8A]"
      : cur.tone === "blue"
        ? "text-[#8FB6E6]"
        : cur.tone === "red"
          ? "text-[#E06B5F]"
          : "text-gold";

  return (
    <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.12em]">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
      </span>
      <span className="text-text-3">LIVE</span>
      <span className="text-text-4">·</span>
      <span className="text-text-2">NEXUS OPS</span>
      <span className="text-text-4">·</span>
      <span
        key={idx}
        className={`${toneClass} animate-[fadeIn_.4s_ease-out]`}
      >
        {cur.label} {cur.value}
      </span>
      <style jsx>{`
        @keyframes fadeIn {
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

/**
 * 타이핑 애니메이션 — 글자가 하나씩 찍힘.
 * 마지막에 도달하면 커서만 깜빡임.
 */
export function TypewriterText({
  text,
  speed = 30,
  startDelay = 500,
  className = "",
  cursor = true,
  loop = false,
  pauseAtEnd = 2000,
}: {
  text: string;
  speed?: number;
  startDelay?: number;
  className?: string;
  cursor?: boolean;
  loop?: boolean;
  pauseAtEnd?: number;
}) {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let charIdx = 0;

    function typeChar() {
      if (charIdx <= text.length) {
        setDisplayed(text.slice(0, charIdx));
        charIdx += 1;
        timeoutId = setTimeout(typeChar, speed);
      } else if (loop) {
        timeoutId = setTimeout(() => {
          setDisplayed("");
          charIdx = 0;
          typeChar();
        }, pauseAtEnd);
      }
    }

    const startId = setTimeout(typeChar, startDelay);
    return () => {
      clearTimeout(startId);
      clearTimeout(timeoutId);
    };
  }, [text, speed, startDelay, loop, pauseAtEnd]);

  return (
    <span className={className}>
      {displayed}
      {cursor ? (
        <span
          aria-hidden
          className="typing-cursor ml-1 inline-block w-[2px] bg-gold"
          style={{
            // 텍스트 body 와 같은 높이 + baseline 에 맞춤
            height: "0.95em",
            verticalAlign: "-0.12em",
          }}
        />
      ) : null}
    </span>
  );
}
