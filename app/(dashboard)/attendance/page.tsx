import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Download,
  Moon,
  Upload,
} from "lucide-react";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import {
  aggregateAttendance,
  WEEK52_THRESHOLD,
  type AttendanceInput,
} from "@/lib/attendance/aggregate";

type SearchParams = {
  month?: string; // YYYY-MM
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

type AvatarTone = "primary" | "secondary" | "error";

// 이름 첫 글자 코드 % 3 → 톤. 부서 톤은 부서 join 추가 시 교체 가능.
function toneForName(name: string): AvatarTone {
  const tones: AvatarTone[] = ["primary", "secondary", "error"];
  return tones[(name.charCodeAt(0) || 0) % tones.length];
}

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
  const supabase = createClient();
  const month = parseMonth(searchParams.month);

  // 부서 + 근태 동시 조회
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

  // Supabase 결과 → 집계 함수 입력으로 정규화
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
            disabled
            aria-label="CSV 가져오기 (Phase 3.4)"
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface-variant opacity-60"
          >
            <Upload aria-hidden className="h-[18px] w-[18px]" />
            CSV 가져오기
          </button>
          <button
            type="button"
            disabled
            aria-label="내보내기 (Phase 5)"
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface-variant opacity-60"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            내보내기
          </button>
          <button
            type="button"
            disabled
            aria-label="근태 입력 (Phase 3.3)"
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded bg-gradient-to-b from-primary-electric to-inverse-primary px-6 py-2 text-label-sm font-semibold text-on-primary opacity-60"
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
          <form
            action="/attendance"
            method="GET"
            className="glass-panel flex flex-col items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center"
          >
            <div className="flex flex-wrap gap-3">
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
              <button
                type="submit"
                className="inline-flex min-h-11 items-center rounded border border-primary-container/40 bg-primary-container/20 px-4 text-label-sm font-medium text-primary-electric transition-colors hover:bg-primary-container/30"
              >
                적용
              </button>
            </div>
            <div className="text-label-sm text-outline-variant">
              {month.label} · {aggregates.length}명
            </div>
          </form>

          {/* 테이블 */}
          <div className="glass-panel overflow-x-auto rounded-lg bg-surface-container-lowest">
            {aggregates.length === 0 ? (
              <div className="p-12 text-center text-body-md text-on-surface-variant">
                {month.label}에 등록된 근태가 없습니다.
              </div>
            ) : (
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
                  {aggregates.map((row) => {
                    const exceeded = row.exceededWeeks > 0;
                    const tone = toneForName(row.name);
                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          "group transition-colors hover:bg-primary-electric/5",
                          exceeded && "border-l-2 border-l-error-soft bg-error-soft/5",
                        )}
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            <InitialsAvatar name={row.name} size="sm" tone={tone} />
                            <div>
                              <div className="font-medium text-on-surface">{row.name}</div>
                              <div className="text-xs text-on-surface-variant">
                                {row.employeeNo}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums">{row.daysWorked}일</td>
                        <td className="px-6 py-3 text-right tabular-nums">
                          {row.regularHours}h
                        </td>
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
                          {exceeded ? (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-error-container/50 bg-error-container/20 px-2.5 py-1 text-[11px] font-semibold text-error-soft">
                              <AlertTriangle aria-hidden className="h-3 w-3 flex-shrink-0" />
                              최대 {row.maxWeeklyHours}h
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-container/50 bg-primary-container/20 px-2.5 py-1 text-[11px] font-semibold text-primary-container">
                              <span
                                aria-hidden
                                className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-primary-container"
                              />
                              {row.maxWeeklyHours}h
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
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
              <SummaryRow
                icon={Clock}
                label="총 근무 시간"
                value={`${formatHours(totalAll)}h`}
                tone="default"
              />
              <SummaryRow
                icon={Clock}
                label="총 연장"
                value={totals.overtime > 0 ? `+${formatHours(totals.overtime)}h` : "0h"}
                tone="tertiary"
              />
              <SummaryRow
                icon={Moon}
                label="야간 근로"
                value={`${formatHours(totals.night)}h`}
                tone="default"
              />
              <SummaryRow
                icon={CalendarDays}
                label="휴일 근로"
                value={`${formatHours(totals.holiday)}h`}
                tone="default"
              />
            </div>
          </div>

          {/* 52시간 경고 */}
          <div className="glass-panel rounded-xl bg-surface-container p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
              <h3 className="text-[18px] font-semibold text-white">주 52시간 초과</h3>
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
                        최대 주 {v.maxWeeklyHours}h{" "}
                        <span className="text-on-surface-variant">
                          / 법정 {WEEK52_THRESHOLD}h · {v.exceededWeeks}주 초과
                        </span>
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
      className="min-h-11 appearance-none rounded border border-outline-variant/40 bg-surface px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
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

function formatHours(n: number): string {
  // 0.5 단위까지 보존, 정수면 정수로.
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
