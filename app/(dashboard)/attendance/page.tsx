import {
  AlertTriangle,
  CalendarDays,
  Clock,
  Download,
  Moon,
  TrendingUp,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { getTranslations } from "next-intl/server";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
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

type AvatarTone = "primary" | "secondary" | "error";

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
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/attendance/import"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-bright"
          >
            <Upload aria-hidden className="h-[18px] w-[18px]" />
            CSV 가져오기
          </Link>
          <a
            href={`/api/attendance/export?year=${month.isoMonth.slice(0, 4)}&month=${Number(month.isoMonth.slice(5, 7))}`}
            aria-label="내보내기"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            내보내기
          </a>
          <Link
            href="/attendance/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary-fixed-dim"
          >
            <Clock aria-hidden className="h-[18px] w-[18px]" />
            근태 입력
          </Link>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label={t("kpi_total_hours")}
          value={`${formatHours(totalAll)}`}
          unit="h"
          icon={Clock}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth={`${Math.min(100, (totalAll / 1000) * 100)}%`}
        />
        <KPICard
          label={t("kpi_overtime")}
          value={`${formatHours(totals.overtime)}`}
          unit="h"
          delta={
            totals.overtime > 0
              ? { icon: TrendingUp, text: "초과 근무 누적", tone: "tertiary" }
              : undefined
          }
          icon={Zap}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth={`${Math.min(100, (totals.overtime / 200) * 100)}%`}
        />
        <KPICard
          label={t("kpi_week52_alert")}
          labelTone={violators.length > 0 ? "text-error-soft" : undefined}
          value={String(violators.length)}
          unit="명"
          valueTone={violators.length > 0 ? "text-error-soft" : undefined}
          icon={AlertTriangle}
          iconTone={violators.length > 0 ? "text-error-soft" : "text-on-surface-variant"}
          barTone={violators.length > 0 ? "bg-error-soft animate-pulse" : "bg-outline"}
          barWidth={violators.length > 0 ? "30%" : "0%"}
          glowText={violators.length > 0}
        />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT 8col */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* Filter */}
          <form
            action="/attendance"
            method="GET"
            className="glass-panel flex flex-col items-start justify-between gap-3 rounded-xl p-stack-md sm:flex-row sm:items-center"
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
                className="inline-flex min-h-11 items-center rounded-lg border border-primary-electric/40 bg-primary-electric/10 px-4 text-label-sm font-medium text-primary-electric transition-colors hover:bg-primary-electric/20"
              >
                {tCommon("apply")}
              </button>
            </div>
            <div className="text-label-sm text-on-surface-variant">
              {month.label} · {aggregates.length}명
            </div>
          </form>

          {/* Table */}
          <div className="glass-panel overflow-x-auto rounded-xl">
            {aggregates.length === 0 ? (
              <div className="p-12 text-center text-body-md text-on-surface-variant">
                {month.label}에 등록된 근태가 없습니다.
              </div>
            ) : (
              <table className="w-full min-w-[700px] border-collapse text-left">
                <thead className="border-b border-outline-variant/20 bg-surface-container/30 text-label-sm text-on-surface-variant">
                  <tr>
                    <th className="px-6 py-4 font-semibold">{t("col_employee")}</th>
                    <th className="px-6 py-4 text-right font-semibold">{t("col_date")}</th>
                    <th className="px-6 py-4 text-right font-semibold">{t("col_regular")}</th>
                    <th className="px-6 py-4 text-right font-semibold">{t("col_overtime")}</th>
                    <th className="px-6 py-4 text-right font-semibold">{t("col_night")}</th>
                    <th className="px-6 py-4 text-right font-semibold">{t("col_holiday")}</th>
                    <th className="px-6 py-4 text-center font-semibold">주 52h</th>
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
                          "group transition-colors hover:bg-surface-container/40",
                          exceeded &&
                            "relative bg-error-soft/5 hover:bg-error-soft/10",
                        )}
                      >
                        <td
                          className={cn(
                            "px-6 py-3",
                            exceeded && "relative pl-7",
                          )}
                        >
                          {exceeded ? (
                            <span
                              aria-hidden
                              className="absolute left-0 top-0 h-full w-1 bg-error-soft opacity-70"
                            />
                          ) : null}
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
                        <td className="px-6 py-3 text-right tabular-nums">
                          {row.daysWorked}일
                        </td>
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
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-error-soft/30 bg-error-soft/10 px-2 py-1 text-[11px] font-semibold text-error-soft">
                              <AlertTriangle aria-hidden className="h-3 w-3" />
                              {row.maxWeeklyHours}h
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-tertiary-sky/30 bg-tertiary-sky/10 px-2 py-1 text-[11px] font-semibold text-tertiary-sky">
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

        {/* RIGHT 4col */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* Monthly Pulse */}
          <div className="glass-panel rounded-xl p-stack-md">
            <div className="mb-stack-md flex items-center gap-2">
              <CalendarDays aria-hidden className="h-5 w-5 text-primary-electric" />
              <h3 className="text-headline-md font-semibold text-on-surface">월간 펄스</h3>
            </div>
            <div className="space-y-4">
              <PulseRow
                icon={Clock}
                label="정상 근로"
                value={`${formatHours(totals.regular)}h`}
                tone="default"
              />
              <PulseRow
                icon={Zap}
                label="연장 근로"
                value={
                  totals.overtime > 0 ? `+${formatHours(totals.overtime)}h` : "0h"
                }
                tone="tertiary"
              />
              <PulseRow
                icon={Moon}
                label="야간 근로"
                value={`${formatHours(totals.night)}h`}
                tone="default"
              />
              <PulseRow
                icon={CalendarDays}
                label="휴일 근로"
                value={`${formatHours(totals.holiday)}h`}
                tone="default"
              />
            </div>
          </div>

          {/* 52h 위험군 */}
          <div className="glass-panel rounded-xl p-stack-md">
            <div className="mb-stack-md flex items-center gap-2">
              <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
              <h3 className="text-headline-md font-semibold text-on-surface">
                주 52시간 위험군
              </h3>
            </div>
            <p className="mb-4 text-label-sm text-on-surface-variant">
              근로기준법 제53조 · 주 12시간 연장 한도 초과
            </p>
            {violators.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">초과 직원 없음</p>
            ) : (
              <ul className="space-y-3">
                {violators.map((v) => (
                  <li
                    key={v.id}
                    className="flex items-center gap-3 rounded-lg border border-error-soft/20 bg-error-soft/5 p-3"
                  >
                    <InitialsAvatar name={v.name} size="sm" tone="error" />
                    <div className="min-w-0 flex-1">
                      <div className="text-data-tabular font-medium text-on-surface">
                        {v.name}
                      </div>
                      <div className="text-label-sm text-error-soft">
                        최대 주 {v.maxWeeklyHours}h{" "}
                        <span className="text-on-surface-variant">
                          / {WEEK52_THRESHOLD}h · {v.exceededWeeks}주 초과
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
      className="min-h-11 appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function PulseRow({
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
          "text-headline-md font-semibold tabular-nums",
          tone === "tertiary" ? "text-tertiary-sky" : "text-on-surface",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function KPICard({
  label,
  labelTone,
  value,
  valueTone,
  unit,
  delta,
  icon: Icon,
  iconTone,
  barTone,
  barWidth,
  glowText,
}: {
  label: string;
  labelTone?: string;
  value: string;
  valueTone?: string;
  unit?: string;
  delta?: { icon: typeof TrendingUp; text: string; tone: "tertiary" };
  icon: typeof Clock;
  iconTone: string;
  barTone: string;
  barWidth: string;
  glowText?: boolean;
}) {
  return (
    <div className="glass-panel relative flex h-32 flex-col justify-between overflow-hidden rounded-lg p-stack-md">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "text-label-sm uppercase tracking-wider",
            labelTone ?? "text-on-surface-variant",
          )}
        >
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5 opacity-70", iconTone)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-display-xl font-bold tracking-tighter tabular-nums",
            valueTone ?? "text-on-surface",
            glowText && "drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-data-tabular text-on-surface-variant">{unit}</span>
        ) : null}
        {delta ? (
          <span className="ml-auto flex items-center text-data-tabular text-tertiary-sky">
            <delta.icon aria-hidden className="mr-1 h-4 w-4" />
            {delta.text}
          </span>
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-1", barTone)}
        style={{ width: barWidth }}
      />
    </div>
  );
}

function formatHours(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
