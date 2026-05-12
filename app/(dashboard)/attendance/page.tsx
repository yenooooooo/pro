import { Clock, Download, Upload } from "lucide-react";
import Link from "next/link";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateAttendance,
  WEEK52_THRESHOLD,
  type AttendanceInput,
} from "@/lib/attendance/aggregate";

type SearchParams = {
  month?: string;
  dept?: string;
};

type AttendanceRow = {
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
  employee: {
    id: string;
    employee_no: string;
    name: string;
    department_id: string | null;
  } | null;
};

function parseMonth(monthStr: string | undefined): {
  label: string;
  isoMonth: string;
  startDate: string;
  endDate: string;
} {
  const today = new Date();
  let target = new Date(today.getFullYear(), today.getMonth(), 1);
  if (monthStr && /^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    target = new Date(y, m - 1, 1);
  }
  return {
    label: format(target, "yyyy'년' M'월'"),
    isoMonth: format(target, "yyyy-MM"),
    startDate: format(startOfMonth(target), "yyyy-MM-dd"),
    endDate: format(endOfMonth(target), "yyyy-MM-dd"),
  };
}

function generateMonthOptions(): { value: string; label: string }[] {
  const result: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({
      value: format(d, "yyyy-MM"),
      label: format(d, "yyyy'년' M'월'"),
    });
  }
  return result;
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("attendance");
  const tCommon = await getTranslations("common");
  const supabase = createClient();
  const month = parseMonth(searchParams.month);

  let attendanceQuery = supabase
    .from("attendance")
    .select(
      `work_date, regular_hours, overtime_hours, night_hours, holiday_hours,
       employee:employees!inner(id, employee_no, name, department_id)`,
    )
    .gte("work_date", month.startDate)
    .lte("work_date", month.endDate);

  if (searchParams.dept) {
    attendanceQuery = attendanceQuery.eq("employee.department_id", searchParams.dept);
  }

  const [{ data: departments }, { data: rows }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    attendanceQuery.returns<AttendanceRow[]>(),
  ]);

  const inputs: AttendanceInput[] = (rows ?? [])
    .filter((r): r is AttendanceRow & { employee: NonNullable<AttendanceRow["employee"]> } =>
      r.employee !== null,
    )
    .map((r) => ({
      employeeId: r.employee.id,
      employeeNo: r.employee.employee_no,
      name: r.employee.name,
      workDate: r.work_date,
      regularHours: Number(r.regular_hours),
      overtimeHours: Number(r.overtime_hours),
      nightHours: Number(r.night_hours),
      holidayHours: Number(r.holiday_hours),
    }));

  const aggregates = aggregateAttendance(inputs);
  const violators = aggregates.filter((a) => a.exceededWeeks > 0);

  const totals = aggregates.reduce(
    (acc, a) => ({
      regular: acc.regular + a.regularHours,
      overtime: acc.overtime + a.overtimeHours,
      night: acc.night + a.nightHours,
      holiday: acc.holiday + a.holidayHours,
    }),
    { regular: 0, overtime: 0, night: 0, holiday: 0 },
  );
  const totalAll = totals.regular + totals.overtime + totals.night + totals.holiday;

  const monthOptions = generateMonthOptions();

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M03</b>Records · Attendance
          </div>
          <h1 className="page-h">
            근태 <em>{formatHours(totalAll)}h.</em>
          </h1>
          <p className="page-sub">
            {t("subtitle")} · {month.label} · {aggregates.length}명
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/attendance/import" className="btn">
            <Upload aria-hidden className="h-[14px] w-[14px]" />
            CSV 가져오기
          </Link>
          <a
            href={`/api/attendance/export?year=${month.isoMonth.slice(0, 4)}&month=${Number(month.isoMonth.slice(5, 7))}`}
            aria-label="내보내기"
            className="btn"
          >
            <Download aria-hidden className="h-[14px] w-[14px]" />
            내보내기
          </a>
          <Link href="/attendance/new" className="btn btn-primary">
            <Clock aria-hidden className="h-[14px] w-[14px]" />
            근태 입력
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_total_hours")}</div>
          <div className="kpi-v">
            {formatHours(totalAll)}
            <span className="ml-2 text-[16px] text-text-3">h</span>
          </div>
          <div className="kpi-meta">
            <span>정상 {formatHours(totals.regular)}h</span>
            <span>야간 {formatHours(totals.night)}h</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_overtime")}</div>
          <div
            className={cn(
              "kpi-v",
              totals.overtime > 0 ? "warn" : "",
            )}
          >
            {formatHours(totals.overtime)}
            <span className="ml-2 text-[16px] text-text-3">h</span>
          </div>
          <div className="kpi-meta">
            <span>휴일 {formatHours(totals.holiday)}h</span>
            <span>
              {totals.overtime > 0 ? "초과 근무 누적" : "이상 없음"}
            </span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_week52_alert")}</div>
          <div
            className={cn(
              "kpi-v",
              violators.length > 0 ? "danger" : "",
            )}
          >
            {violators.length}
            <span className="ml-2 text-[16px] text-text-3">명</span>
          </div>
          <div className="kpi-meta">
            <span>한도 {WEEK52_THRESHOLD}h/주</span>
            <span>{violators.length > 0 ? "법적 리스크" : "이상 없음"}</span>
          </div>
        </div>
      </div>

      {/* ===== Filter + Table ===== */}
      <section className="panel mb-9">
        <div className="panel-h">
          <div className="t font-serif">
            일별 <em>근태</em>
          </div>
          <div className="meta">
            {month.label} · 확정 {confirmedTotal(aggregates)}건
          </div>
        </div>

        <form
          action="/attendance"
          method="GET"
          className="mb-6 flex flex-wrap items-center gap-3"
        >
          <FilterSelect
            name="month"
            ariaLabel="조회 월"
            value={month.isoMonth}
            options={monthOptions}
          />
          <FilterSelect
            name="dept"
            ariaLabel="부서"
            value={searchParams.dept ?? ""}
            options={[
              { value: "", label: "전체 부서" },
              ...(departments ?? []).map((d) => ({ value: d.id, label: d.name })),
            ]}
          />
          <button type="submit" className="btn">
            {tCommon("apply")}
          </button>
        </form>

        {aggregates.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            {month.label}에 등록된 근태가 없습니다.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[700px]">
              <thead>
                <tr>
                  <th>{t("col_employee")}</th>
                  <th className="text-right">{t("col_date")}</th>
                  <th className="text-right">{t("col_regular")}</th>
                  <th className="text-right">{t("col_overtime")}</th>
                  <th className="text-right">{t("col_night")}</th>
                  <th className="text-right">{t("col_holiday")}</th>
                  <th className="text-center">주 52h</th>
                </tr>
              </thead>
              <tbody>
                {aggregates.map((row) => {
                  const exceeded = row.exceededWeeks > 0;
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="flex flex-col">
                          <span className="text-text-1">{row.name}</span>
                          <span className="font-mono text-[10px] tracking-[0.05em] text-text-3">
                            {row.employeeNo}
                          </span>
                        </div>
                      </td>
                      <td className="n">{row.daysWorked}일</td>
                      <td className="n">{row.regularHours}h</td>
                      <td className="n">
                        {row.overtimeHours > 0 ? `+${row.overtimeHours}h` : "—"}
                      </td>
                      <td className="n">
                        {row.nightHours > 0 ? `${row.nightHours}h` : "—"}
                      </td>
                      <td className="n">
                        {row.holidayHours > 0 ? `${row.holidayHours}h` : "—"}
                      </td>
                      <td className="text-center">
                        {exceeded ? (
                          <span className="chip rej">
                            <i />
                            {row.maxWeeklyHours}h
                          </span>
                        ) : (
                          <span className="chip ok">
                            <i />
                            {row.maxWeeklyHours}h
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

      {/* ===== 52h 위험군 ===== */}
      <div className="section-rule">
        <span className="l">
          <b>R01</b>Risk · 52h Threshold
        </span>
        <span className="line" />
      </div>

      <section className="panel">
        <div className="panel-h">
          <div className="t font-serif text-[20px]">
            <em>주 52시간</em> 위험군
          </div>
          <div className="meta">근로기준법 제53조 · 주 12시간 연장 한도</div>
        </div>
        {violators.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-8 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            초과 직원 없음
          </div>
        ) : (
          <ul className="flex flex-col">
            {violators.map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 border-b border-line py-[14px] last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-text-1">{v.name}</p>
                  <p className="mt-[2px] font-mono text-[10px] tracking-[0.05em] text-text-3">
                    최대 주 {v.maxWeeklyHours}h / {WEEK52_THRESHOLD}h · {v.exceededWeeks}주 초과
                  </p>
                </div>
                <span className="chip rej">
                  <i />
                  긴급
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function FilterSelect({
  name,
  ariaLabel,
  value,
  options,
}: {
  name: string;
  ariaLabel: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      aria-label={ariaLabel}
      defaultValue={value}
      className="h-9 appearance-none border border-line bg-bg-1 px-3 pr-8 font-mono text-[12px] text-text-1 outline-none focus:border-gold-soft"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function formatHours(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function confirmedTotal(
  aggregates: ReturnType<typeof aggregateAttendance>,
): number {
  return aggregates.reduce((s, a) => s + a.daysWorked, 0);
}
