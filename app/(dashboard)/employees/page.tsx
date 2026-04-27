import {
  Activity,
  Building2,
  CalendarPlus,
  Search,
  Sparkles,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { differenceInYears, format } from "date-fns";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  dept?: string;
  q?: string;
};

type AvatarTone = "primary" | "secondary" | "error";

const DEPT_TONE: Record<string, { badge: string; avatar: AvatarTone; bar: string }> = {
  경영지원: {
    badge: "border-tertiary-sky/30 bg-tertiary-sky/10 text-tertiary-sky",
    avatar: "primary",
    bar: "bg-tertiary-sky",
  },
  영업: {
    badge: "border-primary-electric/30 bg-primary-electric/10 text-primary-electric",
    avatar: "secondary",
    bar: "bg-primary-electric",
  },
  개발: {
    badge: "border-secondary-slate/40 bg-secondary-slate/10 text-secondary-slate",
    avatar: "error",
    bar: "bg-secondary-slate",
  },
};

const DEFAULT_TONE: { badge: string; avatar: AvatarTone; bar: string } = {
  badge: "border-outline-variant/30 bg-surface-container-high text-on-surface-variant",
  avatar: "primary",
  bar: "bg-outline",
};

type EmployeeListItem = {
  id: string;
  employee_no: string;
  name: string;
  hire_date: string;
  department: { id: string; name: string } | null;
  position: { id: string; name: string; level: number } | null;
};

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = createClient();

  let employeeQuery = supabase
    .from("employees")
    .select(
      `id, employee_no, name, hire_date,
       department:departments(id, name),
       position:positions(id, name, level)`,
    )
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name");

  if (searchParams.dept) {
    employeeQuery = employeeQuery.eq("department_id", searchParams.dept);
  }
  const trimmedQ = searchParams.q?.trim();
  if (trimmedQ) {
    const safe = trimmedQ.replace(/[%_]/g, (m) => `\\${m}`);
    employeeQuery = employeeQuery.or(
      `name.ilike.%${safe}%,employee_no.ilike.%${safe}%,email.ilike.%${safe}%`,
    );
  }

  const [{ data: departments }, { data: employees }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    employeeQuery.returns<EmployeeListItem[]>(),
  ]);

  const list = employees ?? [];
  const allDepts = departments ?? [];

  // 부서별 인원 분포 — 필터와 무관하게 전사 기준 (필터 적용 시 보고용 사이드 패널은 그대로)
  const { data: allEmployees } = await supabase
    .from("employees")
    .select("id, department_id, hire_date")
    .is("deleted_at", null)
    .eq("status", "active")
    .returns<{ id: string; department_id: string | null; hire_date: string }[]>();

  const totalCount = allEmployees?.length ?? 0;
  const deptDistribution = allDepts.map((d) => {
    const count = (allEmployees ?? []).filter((e) => e.department_id === d.id).length;
    return {
      id: d.id,
      name: d.name,
      count,
      ratio: totalCount > 0 ? count / totalCount : 0,
    };
  });

  // 이번달 신규 입사
  const today = new Date();
  const monthStart = format(new Date(today.getFullYear(), today.getMonth(), 1), "yyyy-MM-dd");
  const newHires = (allEmployees ?? [])
    .filter((e) => e.hire_date >= monthStart)
    .map((e) => list.find((l) => l.id === e.id))
    .filter((e): e is EmployeeListItem => Boolean(e))
    .slice(0, 5);

  // 평균 근속
  const avgYearsRaw =
    (allEmployees ?? []).reduce((s, e) => s + differenceInYears(today, new Date(e.hire_date)), 0) /
    Math.max(1, allEmployees?.length ?? 1);

  function buildHref(overrides: SearchParams): string {
    const next: SearchParams = { ...searchParams, ...overrides };
    const sp = new URLSearchParams();
    if (next.dept) sp.set("dept", next.dept);
    if (next.q) sp.set("q", next.q);
    const qs = sp.toString();
    return qs ? `/employees?${qs}` : "/employees";
  }

  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            직원 정보
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            인적 자원 마스터 · 부서·직급·근속 통합 관리
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/employees/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-colors hover:bg-primary-fixed-dim"
          >
            <UserPlus aria-hidden className="h-[18px] w-[18px]" />
            직원 추가
          </Link>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="총 활성 직원"
          value={String(totalCount)}
          unit="명"
          icon={Users}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth="80%"
        />
        <KPICard
          label="부서"
          value={String(allDepts.length)}
          unit="개"
          icon={Building2}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth="60%"
        />
        <KPICard
          label="평균 근속"
          value={avgYearsRaw.toFixed(1)}
          unit="년"
          icon={Activity}
          iconTone="text-secondary-slate"
          barTone="bg-secondary-slate"
          barWidth="50%"
        />
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT 8col — Directory */}
        <div className="col-span-12 lg:col-span-8">
          <div className="glass-panel rounded-xl p-stack-md">
            {/* Search + filters */}
            <div className="mb-stack-md flex flex-wrap items-center gap-3">
              <form action="/employees" method="GET" className="relative w-full max-w-xs flex-1">
                {searchParams.dept ? (
                  <input type="hidden" name="dept" value={searchParams.dept} />
                ) : null}
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
                <input
                  type="search"
                  name="q"
                  defaultValue={searchParams.q ?? ""}
                  placeholder="이름·사번·이메일"
                  className="min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low py-1.5 pl-9 pr-3 text-data-tabular text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
                />
              </form>

              <div className="flex flex-wrap gap-2">
                <FilterChip
                  href={buildHref({ dept: undefined })}
                  active={!searchParams.dept}
                >
                  전체
                </FilterChip>
                {allDepts.map((d) => (
                  <FilterChip
                    key={d.id}
                    href={buildHref({ dept: d.id })}
                    active={searchParams.dept === d.id}
                  >
                    {d.name}
                  </FilterChip>
                ))}
              </div>

              <span className="ml-auto text-label-sm text-on-surface-variant">
                {list.length}명 표시
              </span>
            </div>

            {/* Directory grid */}
            {list.length === 0 ? (
              <div className="rounded-lg border border-outline-variant/30 bg-surface-container-lowest/40 p-12 text-center text-body-md text-on-surface-variant">
                조건에 맞는 직원이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2 xl:grid-cols-3">
                {list.map((emp) => (
                  <EmployeeCard key={emp.id} emp={emp} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT 4col — 부서 분포 + 신규 입사 */}
        <div className="col-span-12 flex flex-col gap-gutter lg:col-span-4">
          {/* 부서별 분포 */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Building2 aria-hidden className="h-5 w-5 text-primary-electric" />
              부서별 분포
            </h3>
            {deptDistribution.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">부서 데이터가 없습니다.</p>
            ) : (
              <div className="space-y-4">
                {deptDistribution.map((d) => {
                  const tone = DEPT_TONE[d.name] ?? DEFAULT_TONE;
                  const pct = Math.round(d.ratio * 100);
                  return (
                    <div key={d.id}>
                      <div className="mb-1.5 flex justify-between text-data-tabular">
                        <span className="text-on-surface">{d.name}</span>
                        <span className="font-bold text-on-surface">
                          {d.count}
                          <span className="ml-1 text-xs font-normal text-on-surface-variant">
                            ({pct}%)
                          </span>
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          aria-hidden
                          className={cn("h-full rounded-full", tone.bar)}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 신규 입사 */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Sparkles aria-hidden className="h-5 w-5 text-tertiary-sky" />
              신규 입사
            </h3>
            <p className="mb-4 text-label-sm text-on-surface-variant">
              {format(today, "yyyy'년' M'월'")} 입사자
            </p>
            {newHires.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">해당 없음</p>
            ) : (
              <ul className="space-y-3">
                {newHires.map((emp) => {
                  const tone = emp.department?.name
                    ? (DEPT_TONE[emp.department.name] ?? DEFAULT_TONE)
                    : DEFAULT_TONE;
                  return (
                    <li
                      key={emp.id}
                      className="flex items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container/50 p-2.5 transition-colors hover:bg-surface-container"
                    >
                      <InitialsAvatar name={emp.name} size="sm" tone={tone.avatar} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-data-tabular text-on-surface">
                          {emp.name}
                        </div>
                        <div className="truncate text-label-sm text-on-surface-variant">
                          {emp.department?.name ?? "—"} · {emp.hire_date}
                        </div>
                      </div>
                      <CalendarPlus
                        aria-hidden
                        className="h-4 w-4 flex-shrink-0 text-tertiary-sky"
                      />
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

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-11 items-center rounded-full px-4 text-label-sm transition-colors",
        active
          ? "border border-primary-electric/40 bg-primary-electric/10 text-primary-electric"
          : "border border-outline-variant/50 bg-surface-container text-on-surface-variant hover:border-outline-variant",
      )}
    >
      {children}
    </Link>
  );
}

function EmployeeCard({ emp }: { emp: EmployeeListItem }) {
  const tone = emp.department?.name
    ? (DEPT_TONE[emp.department.name] ?? DEFAULT_TONE)
    : DEFAULT_TONE;
  const hireText = emp.hire_date
    ? emp.hire_date.replace(/-/g, ".").slice(0, 7)
    : "—";

  return (
    <Link
      href={`/employees/${emp.id}`}
      className="group relative flex flex-col gap-stack-sm overflow-hidden rounded-xl border border-outline-variant/30 bg-surface-container-low/60 p-stack-md backdrop-blur-[12px] transition-colors hover:border-primary-electric/30 hover:bg-surface-container/80"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between">
        <InitialsAvatar name={emp.name} size="lg" tone={tone.avatar} />
        <span
          className={cn(
            "inline-flex whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold",
            tone.badge,
          )}
        >
          {emp.department?.name ?? "미지정"}
        </span>
      </div>

      <div className="relative mt-2">
        <h3 className="text-body-lg font-semibold text-on-surface transition-colors group-hover:text-primary-electric">
          {emp.name}
        </h3>
        <p className="text-sm text-on-surface-variant">
          {emp.position?.name ?? "직급 미지정"}
        </p>
      </div>

      <div className="relative mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <span className="text-[12px] tabular-nums text-outline">입사 {hireText}</span>
        <span className="text-[11px] tabular-nums text-on-surface-variant">
          {emp.employee_no}
        </span>
      </div>
    </Link>
  );
}

/* KPI Card — common pattern */
function KPICard({
  label,
  value,
  unit,
  icon: Icon,
  iconTone,
  barTone,
  barWidth,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: typeof Users;
  iconTone: string;
  barTone: string;
  barWidth: string;
}) {
  return (
    <div className="glass-panel relative flex h-32 flex-col justify-between overflow-hidden rounded-lg p-stack-md">
      <div className="flex items-start justify-between">
        <span className="text-label-sm uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5 opacity-70", iconTone)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-display-xl font-bold tracking-tighter tabular-nums text-on-surface">
          {value}
        </span>
        {unit ? (
          <span className="text-data-tabular text-on-surface-variant">{unit}</span>
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
