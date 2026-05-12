import Link from "next/link";
import { format } from "date-fns";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import { LeaveActions } from "./list/_components/leave-actions";

type EmployeeRow = {
  id: string;
  department_id: string | null;
  hire_date: string;
};

type OngoingLeaveRow = {
  employee_id: string;
  employee: { department_id: string | null } | null;
};

type LeaveBalanceRow = {
  remaining: number;
  total_granted: number;
  total_used: number;
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

export default async function LeavePage() {
  const t = await getTranslations("leave");
  const supabase = createClient();
  const today = format(new Date(), "yyyy-MM-dd");
  const currentYear = new Date().getFullYear();

  const [
    { data: employees },
    { data: ongoing },
    { data: balances },
    { data: recent },
  ] = await Promise.all([
    supabase
      .from("employees")
      .select("id, department_id, hire_date")
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
        `remaining, total_granted, total_used,
         employee:employees!inner(id, name, department:departments(name))`,
      )
      .eq("year", currentYear)
      .order("remaining", { ascending: false })
      .returns<LeaveBalanceRow[]>(),
    supabase
      .from("leave_requests")
      .select(
        `id, leave_type, start_date, end_date, days, reason, status,
         employee:employees!inner(name, department:departments(name))`,
      )
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<RecentRequestRow[]>(),
  ]);

  const balanceList = (balances ?? []).filter(
    (b): b is LeaveBalanceRow & { employee: NonNullable<LeaveBalanceRow["employee"]> } =>
      Boolean(b.employee),
  );

  const totalGranted = balanceList.reduce((s, b) => s + Number(b.total_granted), 0);
  const totalUsed = balanceList.reduce((s, b) => s + Number(b.total_used), 0);
  const totalRemaining = balanceList.reduce((s, b) => s + Number(b.remaining), 0);

  const promotionTargets = balanceList.filter((b) => {
    const granted = Number(b.total_granted);
    const used = Number(b.total_used);
    return granted > 0 && used / granted < 0.8;
  });
  const promotionSet = new Set(promotionTargets.map((p) => p.employee.id));

  const onLeaveToday = (ongoing ?? []).length;
  const activeCount = (employees ?? []).length;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M05</b>Cycle · Leave
          </div>
          <h1 className="page-h">
            연차 <em>잔여.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`/api/leave/export?year=${currentYear}`}
            aria-label="리포트 다운로드"
            className="btn"
          >
            리포트 다운로드
          </a>
          <Link href="/leave/new" className="btn btn-primary">
            특별 휴가 부여
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-4">
        <KPI
          label="총 발생 (연)"
          value={formatDays(totalGranted)}
          suffix="일"
        />
        <KPI
          label="사용"
          value={formatDays(totalUsed)}
          suffix="일"
        />
        <KPI
          label="잔여"
          value={formatDays(totalRemaining)}
          suffix="일"
          tone="warn"
        />
        <KPI
          label="오늘 휴가중"
          value={String(onLeaveToday)}
          suffix={`/ ${activeCount}명`}
        />
      </div>

      {/* ===== 직원별 잔여 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            직원별 <em>잔여</em>
          </div>
          <div className="meta">
            {currentYear} · 촉진 대상 {promotionTargets.length}명
          </div>
        </div>

        {balanceList.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            {currentYear}년 연차 발생 데이터가 없습니다.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[720px]">
              <thead>
                <tr>
                  <th>직원</th>
                  <th>부서</th>
                  <th className="text-right">발생</th>
                  <th className="text-right">사용</th>
                  <th className="text-right">잔여</th>
                  <th className="text-right">사용률</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {balanceList.map((b) => {
                  const granted = Number(b.total_granted);
                  const used = Number(b.total_used);
                  const remaining = Number(b.remaining);
                  const ratio = granted > 0 ? used / granted : 0;
                  const promote = promotionSet.has(b.employee.id);
                  return (
                    <tr key={b.employee.id}>
                      <td>
                        <span className="text-text-1">{b.employee.name}</span>
                      </td>
                      <td>{b.employee.department?.name ?? "—"}</td>
                      <td className="n">{formatDays(granted)}</td>
                      <td className="n">{formatDays(used)}</td>
                      <td className="n">{formatDays(remaining)}</td>
                      <td className="n">{Math.round(ratio * 100)}%</td>
                      <td>
                        {promote ? (
                          <span className="chip pend">
                            <i />
                            촉진 대상
                          </span>
                        ) : (
                          <span className="chip ok">
                            <i />
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
        )}
      </section>

      {/* ===== 최근 휴가 신청 ===== */}
      <section className="panel border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            최근 <em>신청</em>
          </div>
          <Link
            href={"/leave/list" as never}
            className="font-mono text-[10px] uppercase tracking-[0.1em] text-gold transition-colors hover:text-gold-2"
          >
            모두 보기 →
          </Link>
        </div>

        {(recent ?? []).length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            최근 휴가 신청 내역이 없습니다.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[800px]">
              <thead>
                <tr>
                  <th>신청자</th>
                  <th>소속</th>
                  <th>휴가 종류</th>
                  <th>기간</th>
                  <th>사유</th>
                  <th className="text-right">결재</th>
                </tr>
              </thead>
              <tbody>
                {(recent ?? []).map((r) => {
                  if (!r.employee) return null;
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="text-text-1">{r.employee.name}</span>
                      </td>
                      <td>{r.employee.department?.name ?? "—"}</td>
                      <td>
                        <LeaveTypeChip
                          leaveType={r.leave_type}
                          days={Number(r.days)}
                        />
                      </td>
                      <td>
                        {formatPeriod(r.start_date, r.end_date, Number(r.days))}
                      </td>
                      <td className="max-w-[240px] truncate">{r.reason ?? "—"}</td>
                      <td className="text-right">
                        <ActionCell status={r.status} requestId={r.id} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function KPI({
  label,
  value,
  suffix,
  tone = "default",
}: {
  label: string;
  value: string;
  suffix?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : "text-text-1";
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {value}
        {suffix ? <span className="ml-2 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
    </div>
  );
}

function LeaveTypeChip({
  leaveType,
  days,
}: {
  leaveType: string;
  days: number;
}) {
  if (leaveType === "annual" && days < 1) {
    return <span className="chip">반차</span>;
  }
  const map: Record<string, { label: string; cls: string }> = {
    annual: { label: "연차", cls: "chip info" },
    sick: { label: "병가", cls: "chip rej" },
    family: { label: "경조사", cls: "chip" },
    other: { label: "기타", cls: "chip" },
  };
  const { label, cls } = map[leaveType] ?? { label: leaveType, cls: "chip" };
  return <span className={cls}>{label}</span>;
}

function ActionCell({ status, requestId }: { status: string; requestId: string }) {
  if (status === "pending") {
    return (
      <div className="flex justify-end">
        <LeaveActions requestId={requestId} />
      </div>
    );
  }
  const map: Record<string, { label: string; cls: string }> = {
    approved: { label: "승인됨", cls: "chip ok" },
    rejected: { label: "반려됨", cls: "chip rej" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "chip" };
  return <span className={cls}>{label}</span>;
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
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${Number(m[1])}/${Number(m[2])}`;
}
