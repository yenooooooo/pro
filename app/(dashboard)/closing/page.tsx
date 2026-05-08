import {
  AlertTriangle,
  Check,
  ExternalLink,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";
import { PeriodFilter } from "./_components/period-filter";
import { TaskToggle } from "./_components/task-toggle";
import { AiClosingAssistant } from "./_components/ai-assistant";

const DEFAULT_YEAR = 2026;
const DEFAULT_MONTH = 4;

type ClosingTask = {
  id: string;
  title: string;
  description: string | null;
  order_no: number;
};

type ClosingHistoryRow = {
  task_id: string;
  is_done: boolean;
  completed_at: string | null;
};

type PayrollAggRow = {
  gross_pay: number;
};

type AttendanceAggRow = {
  overtime_hours: number;
};

type EmployeeJoinRow = {
  hire_date: string;
};

export default async function ClosingPage({
  searchParams,
}: {
  searchParams?: { year?: string; month?: string };
}) {
  const year = parseIntInRange(searchParams?.year, 2000, 2100, DEFAULT_YEAR);
  const month = parseIntInRange(searchParams?.month, 1, 12, DEFAULT_MONTH);

  const supabase = createClient();

  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const monthEnd = lastDayOfMonth(year, month);

  const [
    { data: tasksRaw },
    { data: historyRaw },
    { data: payrollAgg },
    { data: attendanceAgg },
    { data: newHires },
  ] = await Promise.all([
    supabase
      .from("closing_tasks")
      .select("id, title, description, order_no")
      .order("order_no")
      .returns<ClosingTask[]>(),
    supabase
      .from("closing_history")
      .select("task_id, is_done, completed_at")
      .eq("year", year)
      .eq("month", month)
      .returns<ClosingHistoryRow[]>(),
    supabase
      .from("payroll")
      .select("gross_pay")
      .eq("pay_year", year)
      .eq("pay_month", month)
      .returns<PayrollAggRow[]>(),
    supabase
      .from("attendance")
      .select("overtime_hours")
      .gte("work_date", monthStart)
      .lte("work_date", monthEnd)
      .returns<AttendanceAggRow[]>(),
    supabase
      .from("employees")
      .select("hire_date")
      .gte("hire_date", monthStart)
      .lte("hire_date", monthEnd)
      .is("deleted_at", null)
      .returns<EmployeeJoinRow[]>(),
  ]);

  const tasks = tasksRaw ?? [];
  const historyMap = new Map(
    (historyRaw ?? []).map((h) => [h.task_id, h]),
  );

  const decoratedTasks = tasks.map((t) => {
    const h = historyMap.get(t.id);
    return {
      ...t,
      isDone: h?.is_done ?? false,
      completedAt: h?.completed_at ?? null,
    };
  });

  const total = decoratedTasks.length;
  const doneCount = decoratedTasks.filter((t) => t.isDone).length;
  const pendingCount = total - doneCount;
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isFullyDone = total > 0 && doneCount === total;

  const totalGross = (payrollAgg ?? []).reduce((s, r) => s + r.gross_pay, 0);
  const totalOvertime = (attendanceAgg ?? []).reduce(
    (s, r) => s + Number(r.overtime_hours),
    0,
  );
  const newHiresCount = (newHires ?? []).length;

  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - progressPct / 100);

  return (
    <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end xl:col-span-12">
        <div>
          <h1 className="mb-2 text-headline-lg font-bold tracking-tight text-white sm:text-display-xl sm:text-5xl">
            Monthly Closing Center
          </h1>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            {year}년 {month}월 결산 · 모든 항목 정합성 확인 후 마감 확정.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <PeriodFilter year={year} month={month} />
          {isFullyDone ? (
            <span className="glass-panel flex items-center gap-3 rounded-lg px-4 py-2.5">
              <Check aria-hidden className="h-4 w-4 text-tertiary-sky" />
              <span className="text-label-sm font-medium text-tertiary-sky">
                전 항목 완료
              </span>
            </span>
          ) : (
            <span className="glass-panel flex items-center gap-3 rounded-lg px-4 py-2.5">
              <span className="relative flex h-2.5 w-2.5" aria-hidden>
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-electric opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary-electric" />
              </span>
              <span className="text-label-sm font-medium text-primary-electric">
                진행 중 · {pendingCount}개 대기
              </span>
            </span>
          )}
        </div>
      </div>

      {/* LEFT */}
      <div className="flex flex-col gap-gutter xl:col-span-4">
        {/* Radial Gauge */}
        <div className="glass-panel group relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-6">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-primary-electric/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <h2 className="mb-6 w-full text-headline-md font-semibold text-white">
            결산 현황
          </h2>
          <div className="relative mb-4 flex h-48 w-48 items-center justify-center">
            <svg
              className="h-full w-full"
              viewBox="0 0 100 100"
              role="img"
              aria-label={`결산 ${progressPct}% 완료`}
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
                strokeDashoffset={dashOffset}
                className="stroke-primary-electric drop-shadow-[0_0_8px_rgba(192,193,255,0.6)] transition-[stroke-dashoffset] duration-500"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[40px] font-bold leading-none tabular-nums text-white">
                {progressPct}%
              </span>
              <span className="mt-1 text-label-sm text-on-surface-variant">완료</span>
            </div>
          </div>
          <div className="mt-2 flex w-full items-center justify-between px-2">
            <GaugeStat label="완료" value={doneCount} />
            <div aria-hidden className="h-8 w-px bg-outline-variant" />
            <GaugeStat
              label="대기"
              value={pendingCount}
              tone={pendingCount > 0 ? "tertiary" : "default"}
            />
            <div aria-hidden className="h-8 w-px bg-outline-variant" />
            <GaugeStat label="전체" value={total} />
          </div>
        </div>

        {/* Report Preview */}
        <div className="glass-panel flex flex-1 flex-col rounded-xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-headline-md font-semibold text-white">리포트 미리보기</h2>
            <a
              href={`/closing/print?year=${year}&month=${month}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="리포트 새 창으로 열기"
              className="text-primary-electric transition-colors hover:text-primary-container"
            >
              <ExternalLink className="h-5 w-5" />
            </a>
          </div>
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
            <div className="relative z-10 space-y-4">
              <PreviewRow
                label="총 급여 (지급)"
                value={totalGross > 0 ? formatKRW(totalGross) : "—"}
              />
              <PreviewRow
                label="연장근로 시간"
                value={
                  totalOvertime > 0
                    ? `${totalOvertime.toLocaleString("ko-KR", {
                        maximumFractionDigits: 1,
                      })} 시간`
                    : "—"
                }
              />
              <PreviewRow label="신규 입사" value={`${newHiresCount} 명`} />
            </div>
            {!isFullyDone ? (
              <div className="mt-auto pt-6">
                <div className="flex items-center gap-2 text-sm font-medium text-error-soft">
                  <AlertTriangle aria-hidden className="h-4 w-4" />
                  미리보기 불완전 · 남은 체크리스트를 완료하세요
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* RIGHT */}
      <div className="flex flex-col gap-4 xl:col-span-8">
        <AiClosingAssistant year={year} month={month} />

        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
          <h3 className="text-[18px] font-semibold text-white">운영 체크리스트</h3>
          <span className="text-label-sm text-on-surface-variant">
            {doneCount} / {total} 완료
          </span>
        </div>

        {decoratedTasks.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center">
            <p className="text-body-md text-on-surface-variant">
              체크리스트 템플릿이 없습니다. seed 데이터를 확인하세요.
            </p>
          </div>
        ) : (
          <ul className="mt-2 space-y-3">
            {decoratedTasks.map((t) => (
              <ClosingTaskCard key={t.id} task={t} year={year} month={month} />
            ))}
          </ul>
        )}

        {/* Final action */}
        <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-outline-variant/30 pt-6 md:flex-row">
          <div className="flex max-w-md items-start gap-2 text-sm text-on-surface-variant">
            <Lock aria-hidden className="mt-1 h-4 w-4 flex-shrink-0 text-tertiary-sky" />
            <span>
              모든 항목 완료 시 마감 확정 가능. 잠금 후 데이터는 감사 로그에 기록되며,
              수정은 별도 권한이 필요합니다.
            </span>
          </div>
          <button
            type="button"
            disabled={!isFullyDone}
            className={cn(
              "group relative overflow-hidden rounded-lg px-8 py-4 transition-all",
              isFullyDone
                ? "border border-primary-electric bg-gradient-to-r from-primary-electric to-primary-container shadow-[0_0_24px_rgba(192,193,255,0.4)] hover:opacity-90"
                : "cursor-not-allowed border border-outline-variant/50 bg-surface-container-high opacity-50",
            )}
          >
            <div className="relative z-10 flex items-center gap-3">
              <span
                className={cn(
                  "text-[18px] font-semibold",
                  isFullyDone ? "text-on-primary" : "text-white",
                )}
              >
                월말 마감 확정
              </span>
              <ShieldCheck
                className={cn(
                  "h-5 w-5",
                  isFullyDone ? "text-on-primary" : "text-white",
                )}
              />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

type DecoratedTask = ClosingTask & { isDone: boolean; completedAt: string | null };

function ClosingTaskCard({
  task,
  year,
  month,
}: {
  task: DecoratedTask;
  year: number;
  month: number;
}) {
  const isDone = task.isDone;
  return (
    <li
      className={cn(
        "glass-panel relative flex items-center justify-between overflow-hidden rounded-lg p-4 transition-colors",
        isDone
          ? "opacity-70 hover:opacity-100"
          : "border-l-4 border-l-tertiary-sky bg-surface-container-highest/20 shadow-[0_4px_20px_rgba(123,208,255,0.05)]",
      )}
    >
      {!isDone ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-r from-tertiary-sky/5 to-transparent"
        />
      ) : null}

      <div className="relative z-10 flex flex-1 items-start gap-4">
        <TaskStatusIcon isDone={isDone} />
        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "text-[16px] font-medium tabular-nums text-white",
              isDone && "line-through decoration-outline-variant",
            )}
          >
            {task.title}
          </h4>
          {task.description ? (
            <p className="mt-1 text-[13px] text-on-surface-variant">
              {task.description}
            </p>
          ) : null}
          {task.completedAt ? (
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold text-outline">
              <span>완료 {formatTimestamp(task.completedAt)}</span>
            </div>
          ) : null}
        </div>
      </div>

      <TaskToggle
        year={year}
        month={month}
        taskId={task.id}
        taskTitle={task.title}
        isDone={isDone}
      />
    </li>
  );
}

function TaskStatusIcon({ isDone }: { isDone: boolean }) {
  if (isDone) {
    return (
      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-primary-electric bg-primary-electric/20 text-primary-electric">
        <Check aria-hidden className="h-[14px] w-[14px]" strokeWidth={3} />
      </div>
    );
  }
  return (
    <div className="mt-1 flex h-6 w-6 flex-shrink-0 animate-pulse items-center justify-center rounded-full border-2 border-tertiary-sky">
      <div aria-hidden className="h-2 w-2 rounded-full bg-tertiary-sky" />
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

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-end justify-between border-b border-outline-variant/30 pb-2">
      <span className="text-data-tabular text-on-surface-variant">{label}</span>
      <span className="text-[22px] font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}

function parseIntInRange(
  v: string | undefined,
  min: number,
  max: number,
  fallback: number,
): number {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  if (!Number.isFinite(n) || n < min || n > max) return fallback;
  return n;
}

function lastDayOfMonth(year: number, month: number): string {
  const d = new Date(Date.UTC(year, month, 0));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
