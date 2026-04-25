import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  Download,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";

type LeaveRow = {
  id: string;
  name: string;
  employeeNo: string;
  hireYear: number;
  totalGranted: number;
  used: number;
  remaining: number;
  tone: "primary" | "secondary" | "error";
};

// Phase 3.2에서 leave_balances 조회로 교체.
// 근거: 근로기준법 제60조 — 입사 1년차 11일, 2년차 15일, 3년차 16일, 이후 2년마다 +1일 최대 25일.
const ROWS: LeaveRow[] = [
  {
    id: "1",
    name: "김영호",
    employeeNo: "DEV-1042",
    hireYear: 2020,
    totalGranted: 17,
    used: 3,
    remaining: 14,
    tone: "primary",
  },
  {
    id: "2",
    name: "이서연",
    employeeNo: "MKT-2291",
    hireYear: 2023,
    totalGranted: 15,
    used: 11,
    remaining: 4,
    tone: "secondary",
  },
  {
    id: "3",
    name: "박민수",
    employeeNo: "SAL-3188",
    hireYear: 2019,
    totalGranted: 18,
    used: 1,
    remaining: 17,
    tone: "error",
  },
  {
    id: "4",
    name: "정지훈",
    employeeNo: "DEV-1088",
    hireYear: 2024,
    totalGranted: 11,
    used: 8,
    remaining: 3,
    tone: "primary",
  },
  {
    id: "5",
    name: "최예진",
    employeeNo: "SAL-3012",
    hireYear: 2021,
    totalGranted: 16,
    used: 13,
    remaining: 3,
    tone: "secondary",
  },
  {
    id: "6",
    name: "강민준",
    employeeNo: "DEV-1150",
    hireYear: 2022,
    totalGranted: 15,
    used: 2,
    remaining: 13,
    tone: "error",
  },
];

// 전사 사용률
const TOTAL_GRANTED = ROWS.reduce((s, r) => s + r.totalGranted, 0);
const TOTAL_USED = ROWS.reduce((s, r) => s + r.used, 0);
const USAGE_PCT = Math.round((TOTAL_USED / TOTAL_GRANTED) * 100);

// 촉진 대상: 사용률 < 50% (근로기준법 제61조 연차 사용 촉진제도)
const PROMOTION_TARGETS = ROWS.filter((r) => r.used / r.totalGranted < 0.5);

// SVG radial
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DASH_OFFSET = CIRCUMFERENCE * (1 - USAGE_PCT / 100);

export default function LeavePage() {
  return (
    <div className="space-y-stack-lg">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
            Leave Balance Ledger
          </h2>
          <p className="text-body-md text-on-surface-variant">
            근로기준법 제60조 기준 연차 발생·사용·잔여 관리
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            내보내기
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded bg-gradient-to-b from-primary-electric to-inverse-primary px-6 py-2 text-label-sm font-semibold text-on-primary shadow-[0_0_15px_rgba(192,193,255,0.3)] transition-opacity hover:opacity-90"
          >
            <CalendarPlus aria-hidden className="h-[18px] w-[18px]" />
            연차 신청
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT: 사용률 gauge + 촉진 대상 */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* 사용률 gauge */}
          <div className="glass-panel relative flex flex-col items-center overflow-hidden rounded-xl p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-electric/20 blur-2xl"
            />
            <h3 className="mb-6 w-full text-headline-md font-semibold text-white">
              전사 연차 사용률
            </h3>
            <div className="relative mb-4 flex h-48 w-48 items-center justify-center">
              <svg
                className="h-full w-full"
                viewBox="0 0 100 100"
                role="img"
                aria-label={`연차 사용률 ${USAGE_PCT}%`}
              >
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  strokeWidth="6"
                  className="stroke-surface-container-highest"
                />
                <circle
                  cx="50"
                  cy="50"
                  r={RADIUS}
                  fill="transparent"
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={DASH_OFFSET}
                  className="stroke-tertiary-sky drop-shadow-[0_0_8px_rgba(123,208,255,0.6)]"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[40px] font-bold leading-none tabular-nums text-white">
                  {USAGE_PCT}%
                </span>
                <span className="mt-1 text-label-sm text-on-surface-variant">
                  사용률
                </span>
              </div>
            </div>
            <div className="mt-2 flex w-full items-center justify-between px-2">
              <GaugeStat label="발생" value={TOTAL_GRANTED} />
              <div aria-hidden className="h-8 w-px bg-outline-variant" />
              <GaugeStat label="사용" value={TOTAL_USED} tone="tertiary" />
              <div aria-hidden className="h-8 w-px bg-outline-variant" />
              <GaugeStat label="잔여" value={TOTAL_GRANTED - TOTAL_USED} />
            </div>
          </div>

          {/* 촉진 대상 */}
          <div className="glass-panel rounded-xl bg-surface-container p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
              <h3 className="text-[18px] font-semibold text-white">연차 사용 촉진 대상</h3>
            </div>
            <p className="mb-4 text-label-sm text-on-surface-variant">
              근로기준법 제61조 · 사용률 50% 미만
            </p>
            {PROMOTION_TARGETS.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">해당 없음</p>
            ) : (
              <ul className="space-y-3">
                {PROMOTION_TARGETS.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-3 rounded-lg border border-error-container/30 bg-error-soft/5 p-3"
                  >
                    <InitialsAvatar name={t.name} size="sm" tone="error" />
                    <div className="min-w-0 flex-1">
                      <div className="text-body-md font-medium text-on-surface">{t.name}</div>
                      <div className="text-label-sm text-error-soft">
                        {Math.round((t.used / t.totalGranted) * 100)}% 사용 · 잔여 {t.remaining}일
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* RIGHT: 직원별 연차 리스트 */}
        <div className="col-span-12 xl:col-span-8">
          <div className="glass-panel overflow-x-auto rounded-xl bg-surface-container-lowest">
            <div className="flex items-center justify-between border-b border-outline-variant/30 bg-surface-container-low px-6 py-4">
              <h3 className="text-[18px] font-semibold text-white">직원별 연차 현황</h3>
              <span className="text-label-sm text-outline-variant">50명 중 {ROWS.length}명</span>
            </div>
            <ul className="divide-y divide-outline-variant/10">
              {ROWS.map((row) => {
                const usagePct = Math.round((row.used / row.totalGranted) * 100);
                const barColor =
                  usagePct < 50
                    ? "bg-error-soft"
                    : usagePct < 80
                      ? "bg-tertiary-sky"
                      : "bg-primary-electric";
                const yearsOfService = 2026 - row.hireYear;
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-4 px-6 py-4 transition-colors hover:bg-primary-electric/5 sm:flex-row sm:items-center"
                  >
                    <div className="flex flex-1 items-center gap-3">
                      <InitialsAvatar name={row.name} size="md" tone={row.tone} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-on-surface">{row.name}</span>
                          <span className="whitespace-nowrap rounded border border-outline-variant/30 bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">
                            {yearsOfService}년차
                          </span>
                        </div>
                        <div className="text-xs text-on-surface-variant">{row.employeeNo}</div>
                      </div>
                    </div>
                    <div className="flex-1 sm:max-w-xs">
                      <div className="mb-1 flex items-center justify-between text-data-tabular">
                        <span className="tabular-nums text-on-surface-variant">
                          {row.used} / {row.totalGranted}일
                        </span>
                        <span
                          className={cn(
                            "text-label-sm font-medium",
                            usagePct < 50
                              ? "text-error-soft"
                              : usagePct < 80
                                ? "text-tertiary-sky"
                                : "text-primary-electric",
                          )}
                        >
                          {usagePct}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          className={cn("h-1.5 rounded-full", barColor)}
                          style={{ width: `${usagePct}%` }}
                          aria-hidden
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <CalendarCheck aria-hidden className="h-4 w-4 text-primary-electric" />
                      <span className="text-headline-md font-semibold tabular-nums text-white">
                        {row.remaining}
                      </span>
                      <span className="text-label-sm text-on-surface-variant">일</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function GaugeStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "tertiary";
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "text-[20px] font-semibold tabular-nums",
          tone === "tertiary" ? "text-tertiary-sky" : "text-white",
        )}
      >
        {value}
      </span>
      <span className="text-[11px] text-outline">{label}</span>
    </div>
  );
}
