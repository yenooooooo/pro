import { CalendarPlus, FileSpreadsheet, Search, UserPlus } from "lucide-react";
import Link from "next/link";
import { differenceInYears, format } from "date-fns";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations("employees");
  const tCommon = await getTranslations("common");
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

  // ★ 3개 쿼리 병렬화 — 이전: Promise.all(2) 후 sequential 1
  const [{ data: departments }, { data: employees }, { data: allEmployees }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    employeeQuery.returns<EmployeeListItem[]>(),
    supabase
      .from("employees")
      .select("id, department_id, hire_date")
      .is("deleted_at", null)
      .eq("status", "active")
      .returns<{ id: string; department_id: string | null; hire_date: string }[]>(),
  ]);

  const list = employees ?? [];
  const allDepts = departments ?? [];

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
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M02</b>Records · Directory
          </div>
          <h1 className="page-h">
            직원 <em>{totalCount}.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/employees/import" className="btn">
            <FileSpreadsheet aria-hidden className="h-[14px] w-[14px]" />
            {t("import_excel")}
          </Link>
          <Link href="/employees/new" className="btn btn-primary">
            <UserPlus aria-hidden className="h-[14px] w-[14px]" />
            {t("add")}
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <KPI label={t("kpi_total_active")} value={totalCount} suffix={t("kpi_total_active_unit")} />
        <KPI label={t("kpi_departments")} value={allDepts.length} suffix={t("kpi_departments_unit")} />
        <KPI label={t("kpi_avg_tenure")} value={Number(avgYearsRaw.toFixed(1))} suffix={t("kpi_avg_tenure_unit")} />
      </div>

      {/* ===== Bento (8/4) ===== */}
      <div className="row-grid" style={{ gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)" }}>
        {/* LEFT — Directory */}
        <section className="panel">
          <div className="panel-h">
            <div className="t font-serif">
              <em>Directory</em>
            </div>
            <div className="meta">{t("displayed", { count: list.length })}</div>
          </div>

          {/* Search + filters */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <form
              action="/employees"
              method="GET"
              className="relative w-full max-w-xs flex-1"
            >
              {searchParams.dept ? (
                <input type="hidden" name="dept" value={searchParams.dept} />
              ) : null}
              <Search
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-text-3"
              />
              <input
                type="search"
                name="q"
                defaultValue={searchParams.q ?? ""}
                placeholder={t("search_placeholder")}
                className="h-9 w-full border border-line bg-bg-1 py-1.5 pl-9 pr-3 font-mono text-[12px] text-text-1 placeholder:text-text-3 focus:border-gold-soft"
              />
            </form>
            <div className="flex flex-wrap gap-2">
              <FilterChip
                href={buildHref({ dept: undefined })}
                active={!searchParams.dept}
              >
                {tCommon("all")}
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
          </div>

          {/* Directory grid */}
          {list.length === 0 ? (
            <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              {t("no_match")}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-px bg-line md:grid-cols-2 xl:grid-cols-3">
              {list.map((emp) => (
                <EmployeeCard
                  key={emp.id}
                  emp={emp}
                  labels={{
                    unassignedDept: t("unassigned_dept"),
                    unassignedPosition: t("unassigned_position"),
                    hireDateLabel: t("hire_date_label"),
                  }}
                />
              ))}
            </div>
          )}
        </section>

        {/* RIGHT — Dept distribution + New hires */}
        <div className="flex flex-col gap-px bg-line">
          <section className="panel">
            <div className="panel-h">
              <div className="t font-serif text-[18px]">
                <em>부서별</em> 분포
              </div>
            </div>
            {deptDistribution.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                {t("no_dept_data")}
              </p>
            ) : (
              <div className="space-y-4">
                {deptDistribution.map((d) => {
                  const pct = Math.round(d.ratio * 100);
                  return (
                    <div key={d.id}>
                      <div className="mb-1.5 flex items-baseline justify-between font-mono text-[12px]">
                        <span className="text-text-1">{d.name}</span>
                        <span className="text-text-1">
                          <span className="font-serif text-[18px] italic">{d.count}</span>
                          <span className="ml-1.5 text-[10px] text-text-3">
                            {pct}%
                          </span>
                        </span>
                      </div>
                      <div className="h-px w-full bg-line">
                        <div
                          aria-hidden
                          className="h-px bg-gold"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-h">
              <div className="t font-serif text-[18px]">
                <em>신규</em> 입사
              </div>
              <div className="meta">
                {t("new_hires_caption", {
                  year: today.getFullYear(),
                  month: today.getMonth() + 1,
                })}
              </div>
            </div>
            {newHires.length === 0 ? (
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                {t("no_new_hires")}
              </p>
            ) : (
              <ul className="space-y-px bg-line">
                {newHires.map((emp) => {
                  const tone = emp.department?.name
                    ? (DEPT_TONE[emp.department.name] ?? DEFAULT_TONE)
                    : DEFAULT_TONE;
                  return (
                    <li
                      key={emp.id}
                      className="flex items-center gap-3 bg-bg p-3 transition-colors hover:bg-bg-1"
                    >
                      <InitialsAvatar name={emp.name} size="sm" tone={tone.avatar} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] text-text-1">
                          {emp.name}
                        </div>
                        <div className="truncate font-mono text-[10px] tracking-[0.05em] text-text-3">
                          {emp.department?.name ?? "—"} · {emp.hire_date}
                        </div>
                      </div>
                      <CalendarPlus
                        aria-hidden
                        className="h-3 w-3 flex-shrink-0 text-gold"
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
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
        "chip transition-colors",
        active
          ? "border-gold text-gold"
          : "hover:border-line-3 hover:text-text-1",
      )}
    >
      {children}
    </Link>
  );
}

function EmployeeCard({
  emp,
  labels,
}: {
  emp: EmployeeListItem;
  labels: {
    unassignedDept: string;
    unassignedPosition: string;
    hireDateLabel: string;
  };
}) {
  const tone = emp.department?.name
    ? (DEPT_TONE[emp.department.name] ?? DEFAULT_TONE)
    : DEFAULT_TONE;
  const hireText = emp.hire_date
    ? emp.hire_date.replace(/-/g, ".").slice(0, 7)
    : "—";

  return (
    <Link
      href={`/employees/${emp.id}`}
      className="group flex flex-col gap-3 bg-bg p-4 transition-colors hover:bg-bg-1"
    >
      <div className="flex items-start justify-between">
        <InitialsAvatar name={emp.name} size="lg" tone={tone.avatar} />
        <span className="chip">{emp.department?.name ?? labels.unassignedDept}</span>
      </div>
      <div>
        <h3 className="font-serif text-[22px] italic leading-tight text-text-1 transition-colors group-hover:text-gold">
          {emp.name}
        </h3>
        <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
          {emp.position?.name ?? labels.unassignedPosition}
        </p>
      </div>
      <div className="mt-auto flex items-center justify-between border-t border-line pt-3 font-mono text-[10px] tracking-[0.05em] text-text-3">
        <span>
          {labels.hireDateLabel} {hireText}
        </span>
        <span className="text-text-2">{emp.employee_no}</span>
      </div>
    </Link>
  );
}

/* KPI Card — v2 wrapper (Page-level KPI 컴포넌트는 dashboard 에 있음. 여기는 employees 전용 변형) */
function KPI({
  label,
  value,
  suffix,
}: {
  label: string;
  value: number;
  suffix?: string;
}) {
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className="kpi-v">
        {value.toLocaleString("ko-KR")}
        {suffix ? <span className="ml-2 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
    </div>
  );
}
