"use client";

import { useEffect, useState } from "react";

export type LiveOpsProps = {
  recentEvents: Array<{
    ts: string;
    tag: string;
    tagTone: "ok" | "warn" | "crit" | "info";
    msg: string;
  }>;
  burnRateMTD: number; // ₩ 누적
  burnRatePerSec: number; // ₩/sec
  riskGauges: {
    weekly52h: { value: number; max: number };
    leavePromotion: { value: number; max: number };
    minWage: "PASS" | "FAIL";
  };
  presence: { active: number; idle: number; offline: number; total: number };
  approvalsPerSec: number;
  deadlines: Array<{
    daysLeft: number;
    title: string;
    desc: string;
    tone: "default" | "urgent" | "crit";
  }>;
};

/**
 * Live Ops Command Center — v2 디자인의 실시간 운영 화면.
 * 6 패널 (EVENT STREAM / BURN RATE / RISK / PRESENCE / APPROVAL FLOW / DEADLINES)
 */
export function LiveOpsClient(props: LiveOpsProps) {
  const [now, setNow] = useState(new Date());
  const [burn, setBurn] = useState(props.burnRateMTD);
  const [events, setEvents] = useState(props.recentEvents.slice(0, 8));
  const [sparkData, setSparkData] = useState<number[]>(() => {
    // 60s 가짜 데이터 60 포인트
    return Array.from({ length: 60 }, () => Math.random() * 1.5 + 0.5);
  });

  // 매 초마다 시계 + burn rate 증가
  useEffect(() => {
    const id = setInterval(() => {
      setNow(new Date());
      setBurn((b) => b + props.burnRatePerSec);
      setSparkData((arr) => {
        const next = [...arr.slice(1), Math.random() * 1.5 + 0.5];
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [props.burnRatePerSec]);

  // 6초마다 새 이벤트 추가
  useEffect(() => {
    if (props.recentEvents.length === 0) return;
    let idx = 0;
    const id = setInterval(() => {
      idx = (idx + 1) % props.recentEvents.length;
      setEvents((arr) => {
        const newEvent = {
          ...props.recentEvents[idx],
          ts: new Date().toTimeString().slice(0, 8),
        };
        return [newEvent, ...arr.slice(0, 7)];
      });
    }, 6000);
    return () => clearInterval(id);
  }, [props.recentEvents]);

  const stamp = now.toLocaleTimeString("ko-KR", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  const date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  // sparkline path
  const sparkW = 300;
  const sparkH = 120;
  const sparkPath = sparkData
    .map((v, i) => {
      const x = (i / (sparkData.length - 1)) * sparkW;
      const y = sparkH - (v / 2) * sparkH * 0.8 - 10;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const sparkArea = `${sparkPath} L ${sparkW} ${sparkH} L 0 ${sparkH} Z`;
  const sparkNow = sparkData[sparkData.length - 1].toFixed(2);

  return (
    <div className="relative min-h-[calc(100vh-9rem)] border-t border-line bg-[#050608] overflow-hidden -mx-4 -my-9 sm:-mx-6 lg:-mx-8">
      {/* Scanline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, transparent 0, transparent 3px, rgba(245,194,107,0.012) 3px, rgba(245,194,107,0.012) 4px)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-0 right-0 top-0 z-[1] h-px bg-gold opacity-40"
        style={{
          animation: "scanline 8s linear infinite",
        }}
      />
      <style jsx>{`
        @keyframes scanline {
          0% { top: 0; opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>

      {/* Top bar */}
      <div className="relative z-[2] flex flex-wrap items-center gap-6 border-b border-line bg-bg/60 px-8 py-[18px] font-mono text-[11px] uppercase tracking-[0.1em] text-text-3">
        <span className="flex items-center gap-2 text-gold">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-gold" />
          </span>
          LIVE
        </span>
        <span className="font-serif text-[24px] italic tracking-[-0.01em] tabular-nums text-text-1 normal-case">
          {date} · {stamp}
          <span className="text-gold text-[16px]">.{ms}</span>
        </span>
        <span className="text-text-4">|</span>
        <span>
          throughput · <b className="font-normal text-gold">{(props.approvalsPerSec * 60).toFixed(1)}</b> events/min
        </span>
        <span className="text-text-4">|</span>
        <span>
          uptime <b className="font-normal text-text-1">99.998%</b>
        </span>
      </div>

      {/* 6-panel grid */}
      <div
        className="relative z-[2] grid gap-px bg-line border-b border-line"
        style={{
          gridTemplateColumns: "1.4fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr",
          minHeight: "calc(100vh - 9rem - 64px)",
        }}
      >
        {/* 01 EVENT STREAM (large) */}
        <div className="bg-[#07080A] p-[22px_24px] row-span-2 overflow-hidden">
          <PanelHeader num="01" title="EVENT STREAM" stateText="STREAMING" stateTone="green" />
          <div className="relative h-[calc(100%-38px)] overflow-hidden font-mono text-[12px] leading-[1.7]">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-12 bg-gradient-to-b from-[#07080A] to-transparent"
            />
            {events.map((e, idx) => (
              <EventRow key={`${e.ts}-${idx}`} event={e} isLatest={idx === 0} />
            ))}
          </div>
        </div>

        {/* 02 BURN RATE */}
        <div className="bg-[#07080A] p-[22px_24px]">
          <PanelHeader num="02" title="PAYROLL · BURN RATE" stateText="ACCRUING" stateTone="gold" />
          <div className="flex flex-col gap-[18px]">
            <div>
              <div className="mb-[6px] font-mono text-[11px] uppercase tracking-[0.08em] text-text-2">
                MTD 누적 인건비
              </div>
              <div className="font-serif text-[56px] italic leading-none tracking-[-0.025em] text-gold tabular-nums">
                <span className="mr-1 font-mono text-[20px] not-italic text-text-3 align-[10px]">
                  ₩
                </span>
                {Math.floor(burn).toLocaleString("ko-KR")}
              </div>
            </div>
            <div className="space-y-2">
              <BurnRow label="초당 발생률" value={`₩${Math.round(props.burnRatePerSec)}`} />
              <BurnRow label="시간당" value={`₩${(props.burnRatePerSec * 3600).toLocaleString("ko-KR")}`} />
              <BurnRow label="연 환산" value={`₩${Math.round(props.burnRatePerSec * 3600 * 24 * 365 / 1_000_000)}M`} last />
            </div>
          </div>
        </div>

        {/* 03 RISK GAUGES */}
        <div className="bg-[#07080A] p-[22px_24px]">
          <PanelHeader
            num="03"
            title="RISK GAUGES"
            stateText={`${props.riskGauges.weekly52h.value > 52 ? "1 CRIT" : "OK"}`}
            stateTone={props.riskGauges.weekly52h.value > 52 ? "red" : "green"}
          />
          <div className="grid grid-cols-3 gap-[14px]">
            <Gauge
              label="주 52H"
              value={`${props.riskGauges.weekly52h.value.toFixed(1)}h`}
              ratio={Math.min(1, props.riskGauges.weekly52h.value / 60)}
              tone={props.riskGauges.weekly52h.value > 52 ? "danger" : "default"}
            />
            <Gauge
              label="연차 촉진"
              value={String(props.riskGauges.leavePromotion.value)}
              ratio={Math.min(1, props.riskGauges.leavePromotion.value / props.riskGauges.leavePromotion.max)}
              tone="default"
            />
            <Gauge
              label="최저시급"
              value={props.riskGauges.minWage}
              ratio={props.riskGauges.minWage === "PASS" ? 0.98 : 0.3}
              tone={props.riskGauges.minWage === "PASS" ? "ok" : "danger"}
            />
          </div>
          <div className="mt-[18px] font-mono text-[11px] leading-[1.7] tracking-[0.06em] text-text-3">
            근기법 §53 · §60 · §61 · 최저임금법
            <br />
            <span className="text-text-2">자동 모니터링 활성 · 5초마다 재평가</span>
          </div>
        </div>

        {/* 04 PRESENCE */}
        <div className="bg-[#07080A] p-[22px_24px]">
          <PanelHeader
            num="04"
            title="PRESENCE"
            stateText={`${props.presence.active} / ${props.presence.total} ACTIVE`}
            stateTone="green"
          />
          <PresenceRadar
            active={props.presence.active}
            idle={props.presence.idle}
            offline={props.presence.offline}
          />
          <div className="mt-3 flex justify-center gap-[14px] font-mono text-[10px] tracking-[0.06em] text-text-3">
            <span className="flex items-center gap-[5px]">
              <i className="h-[6px] w-[6px] rounded-full bg-[#6BCB8A]" />
              active {props.presence.active}
            </span>
            <span className="flex items-center gap-[5px]">
              <i className="h-[6px] w-[6px] rounded-full bg-gold" />
              idle {props.presence.idle}
            </span>
            <span className="flex items-center gap-[5px]">
              <i className="h-[6px] w-[6px] rounded-full bg-text-4" />
              offline {props.presence.offline}
            </span>
          </div>
        </div>

        {/* 05 APPROVAL FLOW SPARKLINE */}
        <div className="bg-[#07080A] p-[22px_24px]">
          <PanelHeader num="05" title="APPROVAL FLOW · 60s" stateText="HEALTHY" stateTone="green" />
          <div className="flex h-[calc(100%-38px)] flex-col">
            <div className="mb-2">
              <span className="font-serif text-[32px] italic leading-none tracking-[-0.015em] text-gold">
                {sparkNow}
              </span>
              <small className="ml-2 font-mono text-[11px] tracking-[0.08em] text-text-3">
                /sec avg
              </small>
            </div>
            <div className="relative flex-1">
              <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" className="h-full w-full">
                <defs>
                  <linearGradient id="loSparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#F5C26B" stopOpacity="0.3" />
                    <stop offset="1" stopColor="#F5C26B" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <g>
                  <line x1="0" y1="30" x2={sparkW} y2="30" stroke="#232830" strokeWidth="1" />
                  <line x1="0" y1="60" x2={sparkW} y2="60" stroke="#232830" strokeWidth="1" />
                  <line x1="0" y1="90" x2={sparkW} y2="90" stroke="#232830" strokeWidth="1" />
                  <text x="2" y="28" fontFamily="JetBrains Mono" fontSize="9" fill="#3A4150">2.0</text>
                  <text x="2" y="58" fontFamily="JetBrains Mono" fontSize="9" fill="#3A4150">1.0</text>
                  <text x="2" y="88" fontFamily="JetBrains Mono" fontSize="9" fill="#3A4150">0.0</text>
                </g>
                <path d={sparkArea} fill="url(#loSparkGrad)" />
                <path d={sparkPath} fill="none" stroke="#F5C26B" strokeWidth="1.4" />
              </svg>
            </div>
          </div>
        </div>

        {/* 06 DEADLINES */}
        <div className="bg-[#07080A] p-[22px_24px]">
          <PanelHeader
            num="06"
            title="DEADLINES"
            stateText={`${props.deadlines.length} UPCOMING`}
            stateTone="gold"
          />
          <div className="flex flex-col gap-[14px]">
            {props.deadlines.map((d, i) => (
              <CountdownRow key={i} deadline={d} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Sub-components
 * ============================================================ */

function PanelHeader({
  num,
  title,
  stateText,
  stateTone,
}: {
  num: string;
  title: string;
  stateText: string;
  stateTone: "green" | "gold" | "red";
}) {
  const toneClass =
    stateTone === "red"
      ? "text-[#E06B5F]"
      : stateTone === "gold"
        ? "text-gold"
        : "text-[#6BCB8A]";
  return (
    <div className="mb-[18px] flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
      <span>
        <b className="mr-2 font-normal text-gold">{num}</b>
        {title}
      </span>
      <span className={`flex items-center gap-[6px] ${toneClass}`}>
        <i className="inline-block h-[5px] w-[5px] animate-pulse rounded-full bg-current" />
        {stateText}
      </span>
    </div>
  );
}

function EventRow({
  event,
  isLatest,
}: {
  event: { ts: string; tag: string; tagTone: "ok" | "warn" | "crit" | "info"; msg: string };
  isLatest: boolean;
}) {
  const tagClass = {
    ok: "border-[rgba(107,203,138,0.4)] text-[#6BCB8A]",
    warn: "border-gold-soft text-gold",
    crit: "border-[rgba(224,107,95,0.4)] text-[#E06B5F]",
    info: "border-[rgba(143,182,230,0.4)] text-[#8FB6E6]",
  }[event.tagTone];
  return (
    <div
      className="grid items-baseline gap-[14px] border-b border-dashed border-line/50 py-[6px]"
      style={{
        gridTemplateColumns: "72px 80px 1fr",
        animation: "eventin 0.3s",
      }}
    >
      <span className="font-mono text-[11px] tracking-[0.05em] text-text-4">{event.ts}</span>
      <span className={`border px-[6px] py-[1px] text-center font-mono text-[10px] tracking-[0.08em] ${tagClass}`}>
        {event.tag}
      </span>
      <span className="text-[13px] text-text-1">
        {event.msg}
        {isLatest ? (
          <span
            aria-hidden
            className="ml-2 inline-block h-[14px] w-[7px] animate-pulse bg-gold align-[-2px]"
          />
        ) : null}
      </span>
      <style jsx>{`
        @keyframes eventin {
          from { opacity: 0; transform: translateX(-6px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function BurnRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[1fr_auto] gap-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] text-text-3 ${
        last ? "" : "border-b border-dashed border-line"
      }`}
    >
      <span>{label}</span>
      <b className="font-serif text-[16px] italic normal-case tracking-normal text-text-1">
        {value}
      </b>
    </div>
  );
}

function Gauge({
  label,
  value,
  ratio,
  tone,
}: {
  label: string;
  value: string;
  ratio: number;
  tone: "default" | "danger" | "ok";
}) {
  const stroke =
    tone === "danger" ? "#E06B5F" : tone === "ok" ? "#6BCB8A" : "#F5C26B";
  const valueColor =
    tone === "danger" ? "text-[#E06B5F]" : tone === "ok" ? "text-[#6BCB8A]" : "text-gold";
  const circumference = 2 * Math.PI * 24;
  const dash = Math.round(circumference * ratio * 0.75); // 약 270° max
  return (
    <div className="text-center">
      <svg viewBox="0 0 60 60" className="mx-auto w-full max-w-[100px]">
        <circle cx="30" cy="30" r="24" fill="none" stroke="#242932" strokeWidth="3" />
        <circle
          cx="30"
          cy="30"
          r="24"
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeDasharray={`${dash} ${circumference}`}
          strokeLinecap="round"
          transform="rotate(-90 30 30)"
        />
      </svg>
      <div className="mt-[6px] font-mono text-[9px] uppercase tracking-[0.12em] text-text-3">{label}</div>
      <div className={`mt-[2px] font-serif text-[20px] italic ${valueColor}`}>{value}</div>
    </div>
  );
}

function PresenceRadar({
  active,
  idle,
  offline,
}: {
  active: number;
  idle: number;
  offline: number;
}) {
  const total = active + idle + offline;
  // 점들을 원형으로 배치
  const dots: Array<{ x: number; y: number; color: string; r: number }> = [];
  let idx = 0;
  function add(count: number, color: string) {
    for (let i = 0; i < count; i++) {
      const angle = (idx / total) * Math.PI * 2 - Math.PI / 2;
      const r = 60 + (i % 3) * 18;
      dots.push({
        x: 100 + Math.cos(angle) * r,
        y: 100 + Math.sin(angle) * r,
        color,
        r: 3 + Math.random() * 2,
      });
      idx++;
    }
  }
  add(active, "#6BCB8A");
  add(idle, "#F5C26B");
  add(offline, "#3A4150");

  return (
    <div className="relative h-[180px]">
      <svg viewBox="0 0 200 200" className="h-full w-full">
        {/* 동심원 */}
        <circle cx="100" cy="100" r="30" fill="none" stroke="#232830" strokeWidth="1" />
        <circle cx="100" cy="100" r="60" fill="none" stroke="#232830" strokeWidth="1" />
        <circle cx="100" cy="100" r="90" fill="none" stroke="#232830" strokeWidth="1" />
        {/* 십자선 */}
        <line x1="10" y1="100" x2="190" y2="100" stroke="#232830" strokeWidth="0.5" />
        <line x1="100" y1="10" x2="100" y2="190" stroke="#232830" strokeWidth="0.5" />
        {/* 점 */}
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} fill={d.color} opacity={d.color === "#3A4150" ? 0.6 : 1}>
            {d.color === "#6BCB8A" ? (
              <animate
                attributeName="opacity"
                values="1;0.5;1"
                dur={`${2 + (i % 3)}s`}
                repeatCount="indefinite"
              />
            ) : null}
          </circle>
        ))}
        {/* 회전하는 sweep */}
        <line x1="100" y1="100" x2="100" y2="20" stroke="#F5C26B" strokeWidth="1" opacity="0.4">
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 100 100"
            to="360 100 100"
            dur="6s"
            repeatCount="indefinite"
          />
        </line>
      </svg>
    </div>
  );
}

function CountdownRow({
  deadline,
}: {
  deadline: { daysLeft: number; title: string; desc: string; tone: "default" | "urgent" | "crit" };
}) {
  const borderClass =
    deadline.tone === "crit"
      ? "border-l-2 border-l-[#E06B5F]"
      : deadline.tone === "urgent"
        ? "border-l-2 border-l-gold"
        : "";
  const ddColor = deadline.tone === "crit" ? "text-[#E06B5F]" : "text-gold";

  // 가짜 hh:mm:ss 카운트다운
  const hours = Math.floor(Math.random() * 24);
  const mins = Math.floor(Math.random() * 60);
  return (
    <div
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-[14px] border border-line bg-bg-1 px-[14px] py-3 ${borderClass}`}
    >
      <div className={`font-serif text-[28px] italic leading-none tracking-[-0.02em] ${ddColor}`}>
        D−{deadline.daysLeft}
      </div>
      <div className="text-[13px] text-text-1">
        {deadline.title}
        <small className="mt-[2px] block font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
          {deadline.desc}
        </small>
      </div>
      <div className="font-mono text-[11px] tracking-[0.06em] tabular-nums text-text-3">
        {String(deadline.daysLeft).padStart(2, "0")}d {String(hours).padStart(2, "0")}h{" "}
        {String(mins).padStart(2, "0")}m
      </div>
    </div>
  );
}
