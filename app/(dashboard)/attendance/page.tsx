import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  Clock,
  Download,
  Moon,
  Upload,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";

type AttendanceRow = {
  id: string;
  name: string;
  employeeNo: string;
  tone: "primary" | "secondary" | "error";
  regularHours: number;
  overtimeHours: number;
  nightHours: number;
  holidayHours: number;
  daysWorked: number;
};

// Phase 3에서 Supabase attendance 테이블 조회로 교체.
const ROWS: AttendanceRow[] = [
  {
    id: "1",
    name: "김영호",
    employeeNo: "DEV-1042",
    tone: "primary",
    regularHours: 168,
    overtimeHours: 12,
    nightHours: 0,
    holidayHours: 0,
    daysWorked: 21,
  },
  {
    id: "2",
    name: "이서연",
    employeeNo: "MKT-2291",
    tone: "secondary",
    regularHours: 168,
    overtimeHours: 4,
    nightHours: 0,
    holidayHours: 0,
    daysWorked: 21,
  },
  {
    id: "3",
    name: "정지훈",
    employeeNo: "DEV-1088",
    tone: "error",
    regularHours: 168,
    overtimeHours: 16,
    nightHours: 8,
    holidayHours: 8,
    daysWorked: 22,
  },
  {
    id: "4",
    name: "최예진",
    employeeNo: "SAL-3012",
    tone: "primary",
    regularHours: 160,
    overtimeHours: 2,
    nightHours: 0,
    holidayHours: 0,
    daysWorked: 20,
  },
  {
    id: "5",
    name: "강민준",
    employeeNo: "DEV-1150",
    tone: "secondary",
    regularHours: 168,
    overtimeHours: 18,
    nightHours: 4,
    holidayHours: 0,
    daysWorked: 22,
  },
];

// 주당 40 + 연장 12 = 52시간. 4주 기준 160+48=208 (법정 상한).
// 월 208시간 초과 시 경고 (단순화 — 실제로는 주간 단위 검증)
const WEEK52_THRESHOLD = 208;

export default function AttendancePage() {
  const violators = ROWS.filter(
    (r) => r.regularHours + r.overtimeHours + r.nightHours + r.holidayHours > WEEK52_THRESHOLD,
  );

  return (
    <div className="space-y-stack-lg">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
            Time &amp; Attendance
          </h2>
          <p className="text-body-md text-on-surface-variant">
            월별 근태 집계 · 연장·야간·휴일 근로 모니터링
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <Upload aria-hidden className="h-[18px] w-[18px]" />
            CSV 가져오기
          </button>
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
            <Clock aria-hidden className="h-[18px] w-[18px]" />
            근태 입력
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT: 테이블 */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* 필터 */}
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <FilterSelect label="2026년 4월" options={["2026년 4월", "2026년 3월", "2026년 2월"]} />
              <FilterSelect label="전체 부서" options={["전체 부서", "개발", "경영", "영업", "마케팅"]} />
            </div>
            <div className="text-label-sm text-outline-variant">
              50명 중 1–{ROWS.length}명 표시
            </div>
          </div>

          {/* 테이블 */}
          <div className="glass-panel overflow-x-auto rounded-lg bg-surface-container-lowest">
            <table className="w-full min-w-[700px] border-collapse text-left">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold">직원</th>
                  <th className="px-6 py-4 text-right font-semibold">근무일</th>
                  <th className="px-6 py-4 text-right font-semibold">정상근로</th>
                  <th className="px-6 py-4 text-right font-semibold">연장</th>
                  <th className="px-6 py-4 text-right font-semibold">야간</th>
                  <th className="px-6 py-4 text-right font-semibold">휴일</th>
                  <th className="px-6 py-4 text-center font-semibold">주 52시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-data-tabular text-on-surface">
                {ROWS.map((row) => {
                  const total =
                    row.regularHours + row.overtimeHours + row.nightHours + row.holidayHours;
                  const over52 = total > WEEK52_THRESHOLD;
                  return (
                    <tr
                      key={row.id}
                      className={cn(
                        "group transition-colors hover:bg-primary-electric/5",
                        over52 && "border-l-2 border-l-error-soft bg-error-soft/5",
                      )}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <InitialsAvatar name={row.name} size="sm" tone={row.tone} />
                          <div>
                            <div className="font-medium text-on-surface">{row.name}</div>
                            <div className="text-xs text-on-surface-variant">{row.employeeNo}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">{row.daysWorked}일</td>
                      <td className="px-6 py-3 text-right tabular-nums">{row.regularHours}h</td>
                      <td className="px-6 py-3 text-right tabular-nums text-tertiary-sky">
                        {row.overtimeHours > 0 ? `+${row.overtimeHours}h` : "–"}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-on-surface-variant">
                        {row.nightHours > 0 ? `${row.nightHours}h` : "–"}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-on-surface-variant">
                        {row.holidayHours > 0 ? `${row.holidayHours}h` : "–"}
                      </td>
                      <td className="px-6 py-3 text-center">
                        {over52 ? (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-error-container/50 bg-error-container/20 px-2.5 py-1 text-[11px] font-semibold text-error-soft">
                            <AlertTriangle aria-hidden className="h-3 w-3 flex-shrink-0" />
                            초과 {total - WEEK52_THRESHOLD}h
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-container/50 bg-primary-container/20 px-2.5 py-1 text-[11px] font-semibold text-primary-container">
                            <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-container" />
                            정상
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: 요약 카드 */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* 월 요약 */}
          <div className="glass-panel relative overflow-hidden rounded-xl bg-surface-container p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-electric/20 blur-2xl"
            />
            <div className="mb-6 flex items-center gap-2">
              <CalendarDays aria-hidden className="h-5 w-5 text-primary-electric" />
              <h3 className="text-[18px] font-semibold text-white">Monthly Summary</h3>
            </div>
            <div className="space-y-4">
              <SummaryRow icon={Clock} label="총 근무 시간" value="888h" tone="default" />
              <SummaryRow icon={Clock} label="총 연장" value="+52h" tone="tertiary" />
              <SummaryRow icon={Moon} label="야간 근로" value="12h" tone="default" />
              <SummaryRow icon={CalendarDays} label="휴일 근로" value="8h" tone="default" />
            </div>
          </div>

          {/* 52시간 경고 */}
          <div className="glass-panel rounded-xl bg-surface-container p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
              <h3 className="text-[18px] font-semibold text-white">52시간 초과 경고</h3>
            </div>
            {violators.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">초과 직원 없음</p>
            ) : (
              <ul className="space-y-3">
                {violators.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-3 rounded-lg border border-error-container/30 bg-error-soft/5 p-3"
                  >
                    <InitialsAvatar name={v.name} size="sm" tone="error" />
                    <div className="min-w-0">
                      <div className="text-body-md font-medium text-on-surface">{v.name}</div>
                      <div className="text-label-sm text-error-soft">
                        이번 달{" "}
                        {v.regularHours + v.overtimeHours + v.nightHours + v.holidayHours}h
                        {" / "}
                        <span className="text-on-surface-variant">법정 {WEEK52_THRESHOLD}h</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        className="min-h-11 appearance-none rounded border border-outline-variant/40 bg-surface px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-outline"
      />
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock;
  label: string;
  value: string;
  tone: "default" | "tertiary";
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div
          aria-hidden
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-electric/10 text-primary-electric"
        >
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-body-md text-on-surface-variant">{label}</span>
      </div>
      <span
        className={cn(
          "text-[20px] font-semibold tabular-nums",
          tone === "tertiary" ? "text-tertiary-sky" : "text-white",
        )}
      >
        {value}
      </span>
    </div>
  );
}
