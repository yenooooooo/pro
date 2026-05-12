import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("closing");

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

  const decoratedTasks = tasks.map((task) => {
    const h = historyMap.get(task.id);
    return {
      ...task,
      isDone: h?.is_done ?? false,
      completedAt: h?.completed_at ?? null,
    };
  });

  const total = decoratedTasks.length;
  const doneCount = decoratedTasks.filter((t) => t.isDone).length;
  const pendingCount = total - doneCount;
  const overdueCount = 0; // 지연 = (현재 데이터 모델상 별도 due_date 없음 → 0)
  const progressPct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const isFullyDone = total > 0 && doneCount === total;

  const totalGross = (payrollAgg ?? []).reduce((s, r) => s + r.gross_pay, 0);
  const totalOvertime = (attendanceAgg ?? []).reduce(
    (s, r) => s + Number(r.overtime_hours),
    0,
  );
  const newHiresCount = (newHires ?? []).length;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M11</b>Cycle · Closing
          </div>
          <h1 className="page-h">
            월말 <em>결산.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodFilter year={year} month={month} />
          <a
            href={`/closing/print?year=${year}&month=${month}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn"
          >
            리포트 미리보기
          </a>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card">
          <div className="kpi-l">진행률</div>
          <div className="kpi-v">
            {progressPct}
            <span className="ml-1 text-[16px] text-text-3">%</span>
          </div>
          <div className="kpi-meta">
            <span className="block w-full">
              <span className="block h-px w-full bg-line">
                <span
                  aria-hidden
                  className="block h-px bg-gold"
                  style={{ width: `${progressPct}%` }}
                />
              </span>
              <span className="mt-1.5 block">
                {doneCount} / {total}
              </span>
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">완료</div>
          <div className="kpi-v">
            {doneCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>{isFullyDone ? "전 항목 완료" : `남은 ${pendingCount}건`}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">대기</div>
          <div className={cn("kpi-v", pendingCount > 0 ? "warn" : "")}>
            {pendingCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>{pendingCount > 0 ? "체크리스트 미처리" : "이상 없음"}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">지연</div>
          <div className={cn("kpi-v", overdueCount > 0 ? "danger" : "")}>
            {overdueCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>{overdueCount > 0 ? "기한 초과" : "정상"}</span>
          </div>
        </div>
      </div>

      {/* ===== AI Assistant ===== */}
      <div className="mb-9">
        <AiClosingAssistant year={year} month={month} />
      </div>

      {/* ===== Body: Checklist + Preview ===== */}
      <div className="row-grid mb-9" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        {/* LEFT — Checklist */}
        <section className="panel">
          <div className="panel-h">
            <div className="t font-serif">
              운영 <em>체크리스트</em>
            </div>
            <div className="meta">
              {doneCount} / {total} 완료
            </div>
          </div>

          {decoratedTasks.length === 0 ? (
            <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              체크리스트 템플릿이 없습니다. seed 데이터를 확인하세요.
            </div>
          ) : (
            <ul className="flex flex-col">
              {decoratedTasks.map((task) => (
                <li
                  key={task.id}
                  className="flex items-start justify-between gap-4 border-b border-line py-4 last:border-b-0"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      className={cn(
                        "mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center border font-mono text-[10px]",
                        task.isDone
                          ? "border-gold bg-gold text-[#0A0A0A]"
                          : "border-line-2 text-transparent",
                      )}
                    >
                      {task.isDone ? "✓" : ""}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h4
                        className={cn(
                          "text-[14px] text-text-1",
                          task.isDone &&
                            "text-text-3 line-through decoration-text-4",
                        )}
                      >
                        {task.title}
                      </h4>
                      {task.description ? (
                        <p className="mt-1 text-[12px] leading-[1.6] text-text-2">
                          {task.description}
                        </p>
                      ) : null}
                      {task.completedAt ? (
                        <p className="mt-1.5 font-mono text-[10px] tracking-[0.05em] text-text-3">
                          완료 {formatTimestamp(task.completedAt)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <TaskToggle
                      year={year}
                      month={month}
                      taskId={task.id}
                      taskTitle={task.title}
                      isDone={task.isDone}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Final action */}
          <div className="mt-6 flex flex-col items-start justify-between gap-4 border-t border-dashed border-line pt-6 md:flex-row md:items-center">
            <p className="max-w-md font-mono text-[11px] leading-[1.6] tracking-[0.02em] text-text-3">
              모든 항목 완료 시 마감 확정 가능. 잠금 후 데이터는 감사 로그에
              기록되며, 수정은 별도 권한이 필요합니다.
            </p>
            <button
              type="button"
              disabled={!isFullyDone}
              className={cn(
                "btn",
                isFullyDone ? "btn-primary" : "cursor-not-allowed opacity-50",
              )}
            >
              월말 마감 확정 →
            </button>
          </div>
        </section>

        {/* RIGHT — Report Preview */}
        <section className="panel">
          <div className="panel-h">
            <div className="t font-serif">
              리포트 <em>미리보기</em>
            </div>
            <div className="meta">
              {year}.{String(month).padStart(2, "0")}
            </div>
          </div>
          <ul className="flex flex-col">
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
          </ul>
          {!isFullyDone ? (
            <p className="mt-4 border-t border-dashed border-line pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-gold">
              미리보기 불완전 · 남은 체크리스트 {pendingCount}건
            </p>
          ) : (
            <p className="mt-4 border-t border-dashed border-line pt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              마감 확정 준비 완료
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-baseline justify-between border-b border-line py-3 last:border-b-0">
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
        {label}
      </span>
      <span className="font-serif text-[20px] italic text-text-1 tabular-nums">
        {value}
      </span>
    </li>
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
