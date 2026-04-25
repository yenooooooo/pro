import {
  CalendarDays,
  Eye,
  Landmark,
  Mail,
  Pencil,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { maskBankAccount } from "@/lib/utils/mask";
import { createClient } from "@/lib/supabase/server";

type SearchParams = {
  dept?: string;
  q?: string;
  selected?: string;
};

type AvatarTone = "primary" | "secondary" | "error";

const DEPT_TONE: Record<string, { badge: string; avatar: AvatarTone }> = {
  경영지원: {
    badge: "border-tertiary-container/30 bg-tertiary-container/20 text-tertiary-sky",
    avatar: "primary",
  },
  영업: {
    badge: "border-primary-container/30 bg-primary-container/10 text-primary-electric",
    avatar: "secondary",
  },
  개발: {
    badge: "border-secondary-container/50 bg-secondary-container/30 text-secondary-slate",
    avatar: "error",
  },
};

const DEFAULT_TONE: { badge: string; avatar: AvatarTone } = {
  badge: "border-outline-variant/30 bg-surface-container-high text-on-surface-variant",
  avatar: "primary",
};

type EmployeeListItem = {
  id: string;
  employee_no: string;
  name: string;
  hire_date: string;
  base_salary: number;
  dependents: number;
  status: string;
  bank_name: string | null;
  bank_account: string | null;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  department: { id: string; name: string } | null;
  position: { id: string; name: string; level: number } | null;
};

type LeaveBalance = {
  total_granted: number;
  total_used: number;
  remaining: number;
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
      `id, employee_no, name, hire_date, base_salary, dependents, status,
       bank_name, bank_account, email, phone, birth_date,
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
  const selected = searchParams.selected
    ? (list.find((e) => e.id === searchParams.selected) ?? list[0])
    : list[0];

  let leaveBalance: LeaveBalance | null = null;
  if (selected) {
    const { data } = await supabase
      .from("leave_balances")
      .select("total_granted, total_used, remaining")
      .eq("employee_id", selected.id)
      .eq("year", 2026)
      .maybeSingle();
    leaveBalance = data;
  }

  function buildHref(overrides: SearchParams): string {
    const next: SearchParams = { ...searchParams, ...overrides };
    const sp = new URLSearchParams();
    if (next.dept) sp.set("dept", next.dept);
    if (next.q) sp.set("q", next.q);
    if (next.selected) sp.set("selected", next.selected);
    const qs = sp.toString();
    return qs ? `/employees?${qs}` : "/employees";
  }

  return (
    <div className="flex flex-col gap-gutter xl:flex-row">
      <div className="min-w-0 flex-1">
        <div className="mb-stack-lg flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
              Dynamic Employee Directory
            </h2>
            <p className="text-body-md text-on-surface-variant">
              직원 역량과 조직 구조를 한눈에 — 총 {list.length}명
            </p>
          </div>
          <Link
            href="/employees/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-inverse-primary px-6 py-3 text-label-sm font-semibold text-on-primary shadow-[0_0_20px_rgba(73,75,214,0.3)] transition-colors hover:bg-primary-container"
          >
            <UserPlus aria-hidden className="h-[18px] w-[18px]" />
            직원 추가
          </Link>
        </div>

        <div className="mb-stack-lg flex flex-wrap items-center gap-3">
          <form action="/employees" method="GET" className="relative w-full max-w-sm">
            {searchParams.dept ? (
              <input type="hidden" name="dept" value={searchParams.dept} />
            ) : null}
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
            />
            <input
              type="search"
              name="q"
              defaultValue={searchParams.q ?? ""}
              placeholder="이름·사번·이메일 검색"
              className="min-h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low py-2 pl-10 pr-4 text-body-md text-on-surface shadow-inner placeholder:text-outline focus:border-inverse-primary focus:outline-none focus:ring-1 focus:ring-inverse-primary"
            />
          </form>

          <FilterChip href={buildHref({ dept: undefined, selected: undefined })} active={!searchParams.dept}>
            전체
          </FilterChip>
          {(departments ?? []).map((d) => (
            <FilterChip
              key={d.id}
              href={buildHref({ dept: d.id, selected: undefined })}
              active={searchParams.dept === d.id}
            >
              {d.name}
            </FilterChip>
          ))}
        </div>

        {list.length === 0 ? (
          <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/40 p-12 text-center text-body-md text-on-surface-variant">
            조건에 맞는 직원이 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2 lg:grid-cols-3">
            {list.map((emp) => (
              <EmployeeGridCard
                key={emp.id}
                emp={emp}
                href={buildHref({ selected: emp.id })}
                isSelected={selected?.id === emp.id}
              />
            ))}
          </div>
        )}
      </div>

      {selected ? (
        <QuickViewPanel
          emp={selected}
          leaveBalance={leaveBalance}
          closeHref={buildHref({ selected: undefined })}
        />
      ) : null}
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
          ? "border border-outline-variant bg-surface-container-highest text-on-surface"
          : "border border-outline-variant/50 bg-surface-container text-on-surface-variant hover:border-outline-variant",
      )}
    >
      {children}
    </Link>
  );
}

function EmployeeGridCard({
  emp,
  href,
  isSelected,
}: {
  emp: EmployeeListItem;
  href: string;
  isSelected: boolean;
}) {
  const tone = emp.department?.name
    ? (DEPT_TONE[emp.department.name] ?? DEFAULT_TONE)
    : DEFAULT_TONE;
  const hireText = emp.hire_date
    ? emp.hire_date.replace(/-/g, ".").slice(0, 7)
    : "—";

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex flex-col gap-stack-sm overflow-hidden rounded-xl border bg-surface-container-low/60 p-stack-md backdrop-blur-[12px] transition-colors",
        isSelected
          ? "border-inverse-primary/50 bg-surface-container-high/80 shadow-[0_0_30px_rgba(73,75,214,0.1)]"
          : "border-outline-variant/30 hover:bg-surface-container/80",
      )}
    >
      {isSelected ? (
        <div
          aria-hidden
          className="absolute left-0 top-0 h-px w-full bg-gradient-to-r from-transparent via-inverse-primary/50 to-transparent"
        />
      ) : null}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100"
      />

      <div className="flex items-start justify-between">
        <InitialsAvatar
          name={emp.name}
          size="lg"
          tone={tone.avatar}
          className={
            isSelected ? "border-2 border-inverse-primary" : "border-outline-variant/50"
          }
        />
        <span
          className={cn(
            "inline-flex whitespace-nowrap rounded-md border px-2.5 py-1 text-[11px] font-semibold",
            tone.badge,
          )}
        >
          {emp.department?.name ?? "미지정"}
        </span>
      </div>

      <div className="mt-2">
        <h3
          className={cn(
            "text-body-lg font-semibold text-on-surface",
            !isSelected && "transition-colors group-hover:text-inverse-primary",
          )}
        >
          {emp.name}
        </h3>
        <p className="text-sm text-on-surface-variant">{emp.position?.name ?? "직급 미지정"}</p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <div className="flex items-center gap-1 text-outline">
          <CalendarDays aria-hidden className="h-[14px] w-[14px]" />
          <span className="text-[12px] tabular-nums">입사 {hireText}</span>
        </div>
        <span className="text-[11px] tabular-nums text-on-surface-variant">{emp.employee_no}</span>
      </div>
    </Link>
  );
}

function QuickViewPanel({
  emp,
  leaveBalance,
  closeHref,
}: {
  emp: EmployeeListItem;
  leaveBalance: LeaveBalance | null;
  closeHref: string;
}) {
  const tone = emp.department?.name
    ? (DEPT_TONE[emp.department.name] ?? DEFAULT_TONE)
    : DEFAULT_TONE;
  const masked = maskBankAccount(emp.bank_account);

  return (
    <aside className="relative hidden w-[340px] flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/80 shadow-2xl backdrop-blur-[24px] xl:flex xl:flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/5"
      />

      <div className="relative h-24 flex-shrink-0 overflow-hidden bg-surface-container-highest/50">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-inverse-primary/20 to-transparent"
        />
        <Link
          href={closeHref}
          aria-label="패널 닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-dim/50 text-on-surface transition-colors hover:bg-surface-dim"
        >
          <X className="h-[18px] w-[18px]" />
        </Link>
      </div>

      <div className="relative flex flex-1 flex-col px-6 pb-6">
        <div className="relative z-20 -mt-10 mb-4">
          <InitialsAvatar
            name={emp.name}
            size="lg"
            tone={tone.avatar}
            className="h-20 w-20 border-4 border-surface-container-lowest text-base shadow-lg"
          />
        </div>

        <div>
          <h2 className="text-headline-md font-semibold text-on-surface">{emp.name}</h2>
          <p className="mb-1 text-body-md text-inverse-primary">
            {emp.position?.name ?? "직급 미지정"}
          </p>
          <p className="text-sm text-outline">
            {emp.employee_no} · {emp.department?.name ?? "부서 미지정"}
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          {emp.email ? (
            <a
              href={`mailto:${emp.email}`}
              className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded border border-outline-variant/50 bg-surface-container-high py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-bright"
            >
              <Mail className="h-4 w-4" />
              메시지
            </a>
          ) : (
            <span
              aria-disabled
              className="flex min-h-11 flex-1 cursor-not-allowed items-center justify-center gap-1 rounded border border-outline-variant/50 bg-surface-container-high py-2 text-label-sm text-outline"
            >
              <Mail className="h-4 w-4" />
              메시지
            </span>
          )}
          <Link
            href={`/employees/${emp.id}`}
            aria-label="상세"
            className="inline-flex min-h-11 w-10 items-center justify-center rounded border border-outline-variant/50 bg-surface-container-high py-2 text-on-surface transition-colors hover:bg-surface-bright"
          >
            <Eye className="h-4 w-4" />
          </Link>
          <Link
            href={`/employees/${emp.id}/edit`}
            aria-label="편집"
            className="inline-flex min-h-11 w-10 items-center justify-center rounded border border-outline-variant/50 bg-surface-container-high py-2 text-on-surface transition-colors hover:bg-surface-bright"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        </div>

        <div aria-hidden className="my-6 h-px w-full bg-outline-variant/20" />

        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-label-sm font-medium text-on-surface-variant">재무 정보</h4>
            <div className="rounded-lg border border-outline-variant/30 bg-surface-dim p-4">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded bg-surface-container text-outline"
                >
                  <Landmark className="h-[18px] w-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="mb-0.5 text-label-sm text-outline">급여 계좌</p>
                  <p className="truncate text-data-tabular tabular-nums text-on-surface">
                    {emp.bank_name ?? "—"} {masked}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-outline-variant/20 pt-3">
                <span className="text-label-sm text-outline">기본급</span>
                <span className="text-data-tabular tabular-nums text-on-surface">
                  {emp.base_salary.toLocaleString("ko-KR")}원
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-label-sm font-medium text-on-surface-variant">연차 현황</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg border border-outline-variant/30 border-l-2 border-l-tertiary-container bg-surface-dim p-3">
                <span className="text-label-sm text-outline">잔여</span>
                <span className="text-headline-md font-semibold tabular-nums text-on-surface">
                  {leaveBalance ? leaveBalance.remaining : "—"}
                  <span className="ml-1 text-sm font-normal text-outline">일</span>
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-outline-variant/30 bg-surface-dim p-3">
                <span className="text-label-sm text-outline">사용</span>
                <span className="text-headline-md font-semibold tabular-nums text-on-surface">
                  {leaveBalance ? leaveBalance.total_used : "—"}
                  <span className="ml-1 text-sm font-normal text-outline">일</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
