import {
  AlertTriangle,
  CalendarCheck,
  CalendarPlus,
  Download,
} from "lucide-react";
import { differenceInYears } from "date-fns";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  year?: string;
  dept?: string;
};

type AvatarTone = "primary" | "secondary" | "error";

type LeaveBalanceRow = {
  total_granted: number;
  total_used: number;
  remaining: number;
  employee: {
    id: string;
    employee_no: string;
    name: string;
    hire_date: string;
    department_id: string | null;
  } | null;
};

function toneForName(name: string): AvatarTone {
  const tones: AvatarTone[] = ["primary", "secondary", "error"];
  return tones[(name.charCodeAt(0) || 0) % tones.length];
}

function parseYear(yearStr: string | undefined): number {
  const now = new Date().getFullYear();
  if (yearStr && /^\d{4}$/.test(yearStr)) {
    const y = Number(yearStr);
    if (y >= 2000 && y <= 2100) return y;
  }
  return now;
}

function generateYearOptions(currentYear: number): number[] {
  return [currentYear, currentYear - 1, currentYear - 2];
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();
  const year = parseYear(searchParams.year);

  let balanceQuery = supabase
    .from("leave_balances")
    .select(
      `total_granted, total_used, remaining,
       employee:employees!inner(id, employee_no, name, hire_date, department_id)`,
    )
    .eq("year", year);

  if (searchParams.dept) {
    balanceQuery = balanceQuery.eq("employee.department_id", searchParams.dept);
  }

  const [{ data: departments }, { data: rows }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    balanceQuery.returns<LeaveBalanceRow[]>(),
  ]);

  // 직원이 있어야 의미 있음 — 정규화
  const balances = (rows ?? [])
    .filter(
      (r): r is LeaveBalanceRow & { employee: NonNullable<LeaveBalanceRow["employee"]> } =>
        r.employee !== null,
    )
    .map((r) => ({
      employeeId: r.employee.id,
      employeeNo: r.employee.employee_no,
      name: r.employee.name,
      hireDate: r.employee.hire_date,
      totalGranted: Number(r.total_granted),
      totalUsed: Number(r.total_used),
      remaining: Number(r.remaining),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const totalGranted = balances.reduce((s, b) => s + b.totalGranted, 0);
  const totalUsed = balances.reduce((s, b) => s + b.totalUsed, 0);
  const usagePct =
    totalGranted > 0 ? Math.round((totalUsed / totalGranted) * 100) : 0;

  // 근로기준법 제61조 — 사용률 50% 미만 직원 = 연차 사용 촉진 대상.
  const promotionTargets = balances.filter(
    (b) => b.totalGranted > 0 && b.totalUsed / b.totalGranted < 0.5,
  );

  const yearOptions = generateYearOptions(new Date().getFullYear());

  // SVG radial 게이지
  const RADIUS = 44;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const dashOffset = CIRCUMFERENCE * (1 - usagePct / 100);

  const referenceDate = new Date(year, 11, 31);

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
            aria-label="연차 신청 (Phase 3.6)"
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded bg-gradient-to-b from-primary-electric to-inverse-primary px-6 py-2 text-label-sm font-semibold text-on-primary opacity-60"
          >
            <CalendarPlus aria-hidden className="h-[18px] w-[18px]" />
            연차 신청
          </button>
        </div>
      </div>

      {/* 필터 */}
      <form
        action="/leave"
        method="GET"
        className="glass-panel flex flex-col items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center"
      >
        <div className="flex flex-wrap gap-3">
          <FilterSelect
            name="year"
            ariaLabel="조회 연도"
            value={String(year)}
            options={yearOptions.map((y) => ({
              value: String(y),
              label: `${y}년`,
            }))}
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
          {year}년 · {balances.length}명
        </div>
      </form>

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
                aria-label={`연차 사용률 ${usagePct}%`}
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
                  className="stroke-tertiary-sky drop-shadow-[0_0_8px_rgba(123,208,255,0.6)]"
                  style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
                />
              </svg>
              <div className="absolute flex flex-col items-center">
                <span className="text-[40px] font-bold leading-none tabular-nums text-white">
                  {usagePct}%
                </span>
                <span className="mt-1 text-label-sm text-on-surface-variant">사용률</span>
              </div>
            </div>
            <div className="mt-2 flex w-full items-center justify-between px-2">
              <GaugeStat label="발생" value={formatDays(totalGranted)} />
              <div aria-hidden className="h-8 w-px bg-outline-variant" />
              <GaugeStat label="사용" value={formatDays(totalUsed)} tone="tertiary" />
              <div aria-hidden className="h-8 w-px bg-outline-variant" />
              <GaugeStat
                label="잔여"
                value={formatDays(totalGranted - totalUsed)}
              />
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
            {promotionTargets.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">해당 없음</p>
            ) : (
              <ul className="space-y-3">
                {promotionTargets.map((t) => (
                  <li
                    key={t.employeeId}
                    className="flex items-center gap-3 rounded-lg border border-error-container/30 bg-error-soft/5 p-3"
                  >
                    <InitialsAvatar name={t.name} size="sm" tone="error" />
                    <div className="min-w-0 flex-1">
                      <div className="text-body-md font-medium text-on-surface">{t.name}</div>
                      <div className="text-label-sm text-error-soft">
                        {Math.round((t.totalUsed / t.totalGranted) * 100)}% 사용 · 잔여{" "}
                        {formatDays(t.remaining)}일
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
              <span className="text-label-sm text-outline-variant">
                {balances.length}명
              </span>
            </div>
            {balances.length === 0 ? (
              <div className="p-12 text-center text-body-md text-on-surface-variant">
                {year}년 leave_balances 데이터가 없습니다. (Phase 3.7 일괄 부여 API 실행 필요)
              </div>
            ) : (
              <ul className="divide-y divide-outline-variant/10">
                {balances.map((row) => {
                  const usageRate =
                    row.totalGranted > 0 ? row.totalUsed / row.totalGranted : 0;
                  const usageRatePct = Math.round(usageRate * 100);
                  const barColor =
                    usageRate < 0.5
                      ? "bg-error-soft"
                      : usageRate < 0.8
                        ? "bg-tertiary-sky"
                        : "bg-primary-electric";
                  const yearsOfService = Math.max(
                    0,
                    differenceInYears(referenceDate, new Date(row.hireDate)),
                  );
                  const tone = toneForName(row.name);
                  return (
                    <li
                      key={row.employeeId}
                      className="flex flex-col gap-4 px-6 py-4 transition-colors hover:bg-primary-electric/5 sm:flex-row sm:items-center"
                    >
                      <div className="flex flex-1 items-center gap-3">
                        <InitialsAvatar name={row.name} size="md" tone={tone} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-on-surface">{row.name}</span>
                            <span className="whitespace-nowrap rounded border border-outline-variant/30 bg-surface-container px-2 py-0.5 text-[11px] text-on-surface-variant">
                              {yearsOfService}년차
                            </span>
                          </div>
                          <div className="text-xs text-on-surface-variant">
                            {row.employeeNo}
                          </div>
                        </div>
                      </div>
                      <div className="sm:w-72">
                        <div className="mb-1 flex items-center justify-between text-data-tabular">
                          <span className="tabular-nums text-on-surface-variant">
                            {formatDays(row.totalUsed)} / {formatDays(row.totalGranted)}일
                          </span>
                          <span
                            className={cn(
                              "text-label-sm font-medium",
                              usageRate < 0.5
                                ? "text-error-soft"
                                : usageRate < 0.8
                                  ? "text-tertiary-sky"
                                  : "text-primary-electric",
                            )}
                          >
                            {usageRatePct}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                          <div
                            className={cn("h-1.5 rounded-full", barColor)}
                            style={{ width: `${Math.min(usageRatePct, 100)}%` }}
                            aria-hidden
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:w-20 sm:justify-end">
                        <CalendarCheck
                          aria-hidden
                          className="h-4 w-4 text-primary-electric"
                        />
                        <span className="text-headline-md font-semibold tabular-nums text-white">
                          {formatDays(row.remaining)}
                        </span>
                        <span className="text-label-sm text-on-surface-variant">일</span>
                      </div>
                    </li>
                  );
                })}
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

function GaugeStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
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

function formatDays(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
