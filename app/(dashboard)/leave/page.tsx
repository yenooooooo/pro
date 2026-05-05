import Link from "next/link";
import { format } from "date-fns";
import {
  Activity,
  ClipboardList,
  Download,
  Plus,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import { LeaveActions } from "./list/_components/leave-actions";

type EmployeeRow = {
  id: string;
  department_id: string | null;
};

type DepartmentRow = {
  id: string;
  name: string;
};

type OngoingLeaveRow = {
  employee_id: string;
  employee: { department_id: string | null } | null;
};

type TopBalanceRow = {
  remaining: number;
  total_granted: number;
  employee: {
    id: string;
    name: string;
    department: { name: string } | null;
  } | null;
};

type RecentRequestRow = {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  employee: {
    name: string;
    department: { name: string } | null;
  } | null;
};

const TONE_CYCLE = ["primary", "tertiary", "secondary", "outline"] as const;
type Tone = (typeof TONE_CYCLE)[number];

const TONE_BAR: Record<Tone, string> = {
  primary: "bg-primary-electric",
  tertiary: "bg-tertiary-sky",
  secondary: "bg-secondary-slate",
  outline: "bg-outline",
};

const TONE_TEXT: Record<Tone, string> = {
  primary: "text-primary-electric",
  tertiary: "text-tertiary-sky",
  secondary: "text-secondary-slate",
  outline: "text-outline",
};

const TONE_GAUGE: Record<Tone, string> = {
  primary: "stroke-primary-electric",
  tertiary: "stroke-tertiary-sky",
  secondary: "stroke-secondary-slate",
  outline: "stroke-outline",
};

const TONE_INITIAL_BG: Record<Tone, string> = {
  primary: "bg-primary-electric/20 text-primary-electric",
  tertiary: "bg-tertiary-sky/20 text-tertiary-sky",
  secondary: "bg-surface-bright text-on-surface",
  outline: "bg-surface-container-high text-on-surface-variant",
};

export default async function LeavePage() {
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentYear = new Date().getFullYear();

  const [
    { data: departments },
    { data: employees },
    { data: ongoing },
    { data: topBalances },
    { data: recent },
  ] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .returns<DepartmentRow[]>(),
    supabase
      .from("employees")
      .select("id, department_id")
      .is("deleted_at", null)
      .eq("status", "active")
      .returns<EmployeeRow[]>(),
    supabase
      .from("leave_requests")
      .select("employee_id, employee:employees!inner(department_id)")
      .lte("start_date", today)
      .gte("end_date", today)
      .eq("status", "approved")
      .returns<OngoingLeaveRow[]>(),
    supabase
      .from("leave_balances")
      .select(
        `remaining, total_granted,
         employee:employees!inner(id, name, department:departments(name))`,
      )
      .eq("year", currentYear)
      .order("remaining", { ascending: false })
      .limit(5)
      .returns<TopBalanceRow[]>(),
    supabase
      .from("leave_requests")
      .select(
        `id, leave_type, start_date, end_date, days, reason, status,
         employee:employees!inner(name, department:departments(name))`,
      )
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RecentRequestRow[]>(),
  ]);

  // 부서별 집계 — 활성 직원 수 + 오늘 휴가 중 인원 수
  const deptStats = (departments ?? []).map((d, i) => {
    const total = (employees ?? []).filter((e) => e.department_id === d.id).length;
    const onLeave = (ongoing ?? []).filter((o) => o.employee?.department_id === d.id).length;
    const ratio = total > 0 ? onLeave / total : 0;
    return {
      id: d.id,
      name: d.name,
      total,
      onLeave,
      ratio,
      tone: TONE_CYCLE[i % TONE_CYCLE.length],
    };
  });

  return (
    <div className="space-y-stack-lg">
      {/* ============================================================
       * Header
       * ============================================================ */}
      <div className="mb-stack-lg flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            연차 및 휴가 관리
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            실시간 전사 휴가 현황 및 승인 시스템
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <a
            href={`/api/leave/export?year=${currentYear}`}
            aria-label="리포트 다운로드"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline bg-surface-container px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            리포트 다운로드
          </a>
          <Link
            href="/leave/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary-fixed-dim"
          >
            <Plus aria-hidden className="h-[18px] w-[18px]" />
            특별 휴가 부여
          </Link>
        </div>
      </div>

      {/* ============================================================
       * Bento Grid
       * ============================================================ */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* 부서별 휴가 현황 (8 cols) */}
        <div className="glass-panel col-span-12 flex flex-col rounded-xl p-stack-md lg:col-span-8">
          <div className="mb-stack-md flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Activity aria-hidden className="h-5 w-5 text-primary-electric" />
              부서별 휴가 현황
            </h3>
            <span className="text-label-sm text-on-surface-variant">오늘 기준</span>
          </div>

          {deptStats.length === 0 ? (
            <p className="flex-1 py-8 text-center text-body-md text-on-surface-variant">
              부서 데이터가 없습니다.
            </p>
          ) : (
            <div className="flex flex-1 flex-col justify-center space-y-6">
              {deptStats.map((d) => {
                const pct = Math.round(d.ratio * 100);
                const subText =
                  d.onLeave > 0
                    ? `(${d.onLeave}명 휴가중)`
                    : d.total > 0
                      ? "(전원 근무)"
                      : "(인원 없음)";
                return (
                  <div key={d.id}>
                    <div className="mb-2 flex items-center justify-between text-data-tabular">
                      <span className="text-on-surface">{d.name}</span>
                      <span className={cn("font-bold", TONE_TEXT[d.tone])}>
                        {pct}%
                        <span className="ml-1 text-xs font-normal text-on-surface-variant">
                          {subText}
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        aria-hidden
                        className={cn("h-full rounded-full", TONE_BAR[d.tone])}
                        style={{ width: `${Math.max(pct, 0)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 잔여 연차 톱 5 (4 cols) */}
        <div className="glass-panel col-span-12 flex flex-col rounded-xl p-stack-md lg:col-span-4">
          <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
            <Timer aria-hidden className="h-5 w-5 text-tertiary-sky" />
            잔여 연차 톱 5
          </h3>
          {(topBalances ?? []).length === 0 ? (
            <p className="flex-1 py-8 text-center text-body-md text-on-surface-variant">
              {currentYear}년 연차 발생 데이터가 없습니다.
            </p>
          ) : (
            <ul className="space-y-3">
              {(topBalances ?? []).map((b, i) => {
                if (!b.employee) return null;
                const tone = TONE_CYCLE[i % TONE_CYCLE.length];
                const remaining = Number(b.remaining);
                const granted = Number(b.total_granted);
                const ratio = granted > 0 ? Math.min(remaining / granted, 1) : 0;
                const dashOffset = 100 * (1 - ratio);
                return (
                  <li
                    key={b.employee.id}
                    className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container p-3 transition-colors hover:bg-surface-bright"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={cn(
                          "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold",
                          TONE_INITIAL_BG[tone],
                        )}
                      >
                        {b.employee.name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-data-tabular text-on-surface">
                          {b.employee.name}
                        </div>
                        <div className="truncate text-label-sm text-on-surface-variant">
                          {b.employee.department?.name ?? "—"}
                        </div>
                      </div>
                    </div>
                    <div className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center">
                      <svg className="absolute inset-0 h-10 w-10" aria-hidden>
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          strokeWidth="4"
                          strokeLinecap="round"
                          className="stroke-surface-container-highest"
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "50% 50%",
                          }}
                        />
                        <circle
                          cx="20"
                          cy="20"
                          r="16"
                          fill="none"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray="100"
                          strokeDashoffset={dashOffset}
                          className={TONE_GAUGE[tone]}
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "50% 50%",
                          }}
                        />
                      </svg>
                      <span className="text-xs font-bold tabular-nums text-on-surface">
                        {formatDays(remaining)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 최근 휴가 신청 내역 (12 cols) */}
        <div className="glass-panel col-span-12 overflow-hidden rounded-xl p-0">
          <div className="flex items-center justify-between border-b border-outline-variant/20 p-stack-md">
            <h3 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <ClipboardList aria-hidden className="h-5 w-5 text-secondary-slate" />
              최근 휴가 신청 내역
            </h3>
            <Link
              href={"/leave/list" as never}
              className="text-label-sm text-primary-electric transition-colors hover:text-primary-container"
            >
              모두 보기 →
            </Link>
          </div>

          {(recent ?? []).length === 0 ? (
            <p className="py-12 text-center text-body-md text-on-surface-variant">
              최근 휴가 신청 내역이 없습니다.
            </p>
          ) : (
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-outline-variant/20 bg-surface-container/30 text-label-sm text-on-surface-variant">
                    <th className="px-6 py-4 font-semibold">신청자</th>
                    <th className="px-6 py-4 font-semibold">소속</th>
                    <th className="px-6 py-4 font-semibold">휴가 종류</th>
                    <th className="px-6 py-4 font-semibold">기간</th>
                    <th className="px-6 py-4 font-semibold">사유</th>
                    <th className="px-6 py-4 text-right font-semibold">결재</th>
                  </tr>
                </thead>
                <tbody className="text-data-tabular">
                  {(recent ?? []).map((r) => {
                    if (!r.employee) return null;
                    return (
                      <tr
                        key={r.id}
                        className="group border-b border-outline-variant/10 transition-colors last:border-b-0 hover:bg-surface-container/40"
                      >
                        <td className="px-6 py-4 font-medium text-on-surface">
                          {r.employee.name}
                        </td>
                        <td className="px-6 py-4 text-on-surface-variant">
                          {r.employee.department?.name ?? "—"}
                        </td>
                        <td className="px-6 py-4">
                          <LeaveTypeBadge
                            leaveType={r.leave_type}
                            days={Number(r.days)}
                          />
                        </td>
                        <td className="px-6 py-4 text-on-surface">
                          {formatPeriod(r.start_date, r.end_date, Number(r.days))}
                        </td>
                        <td className="max-w-[240px] truncate px-6 py-4 text-on-surface-variant">
                          {r.reason ?? "—"}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <ActionCell status={r.status} requestId={r.id} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function LeaveTypeBadge({
  leaveType,
  days,
}: {
  leaveType: string;
  days: number;
}) {
  // annual + 0.5일 → 반차로 표시
  if (leaveType === "annual" && days < 1) {
    return (
      <span className="inline-flex items-center rounded-md border border-secondary-slate/20 bg-secondary-slate/10 px-2 py-1 text-xs text-secondary-slate">
        반차
      </span>
    );
  }
  const map: Record<string, { label: string; className: string }> = {
    annual: {
      label: "연차",
      className: "border-tertiary-sky/20 bg-tertiary-sky/10 text-tertiary-sky",
    },
    sick: {
      label: "병가",
      className: "border-error-soft/20 bg-error-soft/10 text-error-soft",
    },
    family: {
      label: "경조사",
      className: "border-secondary-slate/20 bg-secondary-slate/10 text-secondary-slate",
    },
    other: {
      label: "기타",
      className: "border-outline-variant/30 bg-surface-container text-on-surface-variant",
    },
  };
  const { label, className } =
    map[leaveType] ?? {
      label: leaveType,
      className: "border-outline-variant/30 bg-surface-container text-on-surface-variant",
    };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs",
        className,
      )}
    >
      {label}
    </span>
  );
}

function ActionCell({ status, requestId }: { status: string; requestId: string }) {
  // pending 만 결재 액션 노출. /leave/list 의 LeaveActions 를 그대로 재사용.
  if (status === "pending") {
    return (
      <div className="flex justify-end">
        <LeaveActions requestId={requestId} />
      </div>
    );
  }
  const map: Record<string, { label: string; className: string }> = {
    approved: {
      label: "승인됨",
      className: "border-tertiary-sky/20 bg-tertiary-sky/10 text-tertiary-sky",
    },
    rejected: {
      label: "반려됨",
      className: "border-error-soft/20 bg-error-soft/10 text-error-soft",
    },
  };
  const { label, className } =
    map[status] ?? {
      label: status,
      className: "border-outline-variant/30 bg-surface-container text-on-surface-variant",
    };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
        className,
      )}
    >
      {label}
    </span>
  );
}

/* ============================================================
 * Helpers
 * ============================================================ */

function formatDays(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatPeriod(start: string, end: string, days: number): string {
  const s = formatShortDate(start);
  const e = formatShortDate(end);
  const dayLabel = `(${formatDays(days)}일)`;
  return s === e ? `${s} ${dayLabel}` : `${s} - ${e} ${dayLabel}`;
}

function formatShortDate(iso: string): string {
  // "2026-04-26" → "4/26"
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[1])}/${Number(m[2])}`;
}
