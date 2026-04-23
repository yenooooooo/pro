import {
  CalendarDays,
  Eye,
  Landmark,
  Mail,
  MoreHorizontal,
  Pencil,
  Search,
  UserPlus,
  X,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";

type Dept = "경영" | "영업" | "개발" | "마케팅";

type EmployeeCard = {
  id: string;
  name: string;
  position: string;
  dept: Dept;
  tone: "primary" | "secondary" | "error";
  hired: string;
  selected?: boolean;
};

// Phase 2에서 Supabase 쿼리로 교체.
const EMPLOYEES: EmployeeCard[] = [
  {
    id: "1",
    name: "김지영",
    position: "운영본부장",
    dept: "경영",
    tone: "primary",
    hired: "2021.10",
  },
  {
    id: "2",
    name: "박태준",
    position: "수석 시스템 아키텍트",
    dept: "개발",
    tone: "secondary",
    hired: "2022.03",
    selected: true,
  },
  {
    id: "3",
    name: "이수빈",
    position: "엔터프라이즈 영업",
    dept: "영업",
    tone: "primary",
    hired: "2023.01",
  },
  {
    id: "4",
    name: "정혜원",
    position: "마케팅 매니저",
    dept: "마케팅",
    tone: "secondary",
    hired: "2022.08",
  },
  {
    id: "5",
    name: "강민준",
    position: "시니어 개발자",
    dept: "개발",
    tone: "primary",
    hired: "2021.06",
  },
  {
    id: "6",
    name: "윤서아",
    position: "인사 담당",
    dept: "경영",
    tone: "secondary",
    hired: "2024.02",
  },
];

const DEPT_BADGE: Record<Dept, string> = {
  경영: "border-tertiary-container/30 bg-tertiary-container/20 text-tertiary-sky",
  영업: "border-primary-container/30 bg-primary-container/10 text-primary-electric",
  개발: "border-secondary-container/50 bg-secondary-container/30 text-secondary-slate",
  마케팅: "border-outline-variant/30 bg-surface-container-high text-on-surface-variant",
};

const FILTERS: { label: string; active: boolean }[] = [
  { label: "전체", active: true },
  { label: "경영", active: false },
  { label: "영업", active: false },
  { label: "개발", active: false },
  { label: "마케팅", active: false },
];

const SELECTED = EMPLOYEES.find((e) => e.selected) ?? EMPLOYEES[1];

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-gutter xl:flex-row">
      {/* LEFT: Directory grid */}
      <div className="min-w-0 flex-1">
        {/* Header */}
        <div className="mb-stack-lg flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
              Dynamic Employee Directory
            </h2>
            <p className="text-body-md text-on-surface-variant">
              직원 역량과 조직 구조를 한눈에
            </p>
          </div>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-inverse-primary px-6 py-3 text-label-sm font-semibold text-on-primary shadow-[0_0_20px_rgba(73,75,214,0.3)] transition-colors hover:bg-primary-container"
          >
            <UserPlus aria-hidden className="h-[18px] w-[18px]" />
            직원 추가
          </button>
        </div>

        {/* Filters */}
        <div className="mb-stack-lg flex flex-wrap items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
            />
            <input
              type="search"
              placeholder="이름·직책·사번으로 검색"
              className="min-h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low py-2 pl-10 pr-4 text-body-md text-on-surface shadow-inner transition-all placeholder:text-outline focus:border-inverse-primary focus:outline-none focus:ring-1 focus:ring-inverse-primary"
            />
          </div>
          {FILTERS.map((f) => (
            <button
              key={f.label}
              type="button"
              className={cn(
                "min-h-11 rounded-full px-4 text-label-sm transition-colors",
                f.active
                  ? "border border-outline-variant bg-surface-container-highest text-on-surface"
                  : "border border-outline-variant/50 bg-surface-container text-on-surface-variant hover:border-outline-variant",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2 lg:grid-cols-3">
          {EMPLOYEES.map((emp) => (
            <EmployeeGridCard key={emp.id} emp={emp} />
          ))}
        </div>
      </div>

      {/* RIGHT: Quick View Sidebar (xl 이상에서만 노출) */}
      <QuickViewPanel emp={SELECTED} />
    </div>
  );
}

function EmployeeGridCard({ emp }: { emp: EmployeeCard }) {
  return (
    <div
      className={cn(
        "group relative flex cursor-pointer flex-col gap-stack-sm overflow-hidden rounded-xl border bg-surface-container-low/60 p-stack-md backdrop-blur-[12px] transition-colors",
        emp.selected
          ? "border-inverse-primary/50 bg-surface-container-high/80 shadow-[0_0_30px_rgba(73,75,214,0.1)]"
          : "border-outline-variant/30 hover:bg-surface-container/80",
      )}
    >
      {emp.selected ? (
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
          tone={emp.tone}
          className={
            emp.selected ? "border-2 border-inverse-primary" : "border-outline-variant/50"
          }
        />
        <span
          className={cn(
            "rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
            DEPT_BADGE[emp.dept],
          )}
        >
          {emp.dept}
        </span>
      </div>

      <div className="mt-2">
        <h3
          className={cn(
            "text-body-lg font-semibold text-on-surface",
            !emp.selected && "transition-colors group-hover:text-inverse-primary",
          )}
        >
          {emp.name}
        </h3>
        <p className="text-sm text-on-surface-variant">{emp.position}</p>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <div className="flex items-center gap-1 text-outline">
          <CalendarDays aria-hidden className="h-[14px] w-[14px]" />
          <span className="text-[12px] tabular-nums">입사 {emp.hired}</span>
        </div>
        {!emp.selected ? (
          <button
            type="button"
            aria-label="카드 메뉴"
            className="text-on-surface-variant hover:text-on-surface"
          >
            <MoreHorizontal className="h-[18px] w-[18px]" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

function QuickViewPanel({ emp }: { emp: EmployeeCard }) {
  return (
    <aside className="relative hidden w-[340px] flex-shrink-0 overflow-hidden rounded-xl border border-outline-variant/20 bg-surface-container-lowest/80 shadow-2xl backdrop-blur-[24px] xl:flex xl:flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-xl border border-white/5"
      />

      {/* 배너 */}
      <div className="relative h-24 flex-shrink-0 overflow-hidden bg-surface-container-highest/50">
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-inverse-primary/20 to-transparent"
        />
        <button
          type="button"
          aria-label="패널 닫기"
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border border-outline-variant/50 bg-surface-dim/50 text-on-surface transition-colors hover:bg-surface-dim"
        >
          <X className="h-[18px] w-[18px]" />
        </button>
      </div>

      {/* Profile */}
      <div className="relative flex flex-1 flex-col overflow-y-auto px-6 pb-6">
        <div className="relative z-10 -mt-10 mb-4">
          <InitialsAvatar
            name={emp.name}
            size="lg"
            tone={emp.tone}
            className="h-20 w-20 border-4 border-surface-container-lowest text-base shadow-lg"
          />
        </div>

        <div>
          <h2 className="text-headline-md font-semibold text-on-surface">{emp.name}</h2>
          <p className="mb-1 text-body-md text-inverse-primary">{emp.position}</p>
          <p className="text-sm text-outline">
            ID: DEV-4992 · 서울 본사
          </p>
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            className="flex min-h-11 flex-1 items-center justify-center gap-1 rounded border border-outline-variant/50 bg-surface-container-high py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-bright"
          >
            <Mail className="h-4 w-4" />
            메시지
          </button>
          <button
            type="button"
            aria-label="편집"
            className="inline-flex min-h-11 w-10 items-center justify-center rounded border border-outline-variant/50 bg-surface-container-high py-2 text-on-surface transition-colors hover:bg-surface-bright"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>

        <div aria-hidden className="my-6 h-px w-full bg-outline-variant/20" />

        {/* 재무 정보 */}
        <div className="space-y-6">
          <div>
            <h4 className="mb-3 text-label-sm uppercase tracking-wider text-on-surface-variant">
              재무 정보
            </h4>
            <div className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-dim p-4">
              <div className="flex items-center gap-3">
                <div
                  aria-hidden
                  className="flex h-8 w-8 items-center justify-center rounded bg-surface-container text-outline"
                >
                  <Landmark className="h-[18px] w-[18px]" />
                </div>
                <div>
                  <p className="mb-0.5 text-label-sm text-outline">급여 계좌</p>
                  <p className="text-data-tabular tabular-nums text-on-surface">
                    신한 110-***-***8492
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="계좌번호 전체 보기"
                className="text-inverse-primary hover:text-primary-electric"
              >
                <Eye className="h-[18px] w-[18px]" />
              </button>
            </div>
          </div>

          {/* 연차 현황 */}
          <div>
            <h4 className="mb-3 text-label-sm uppercase tracking-wider text-on-surface-variant">
              연차 현황
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1 rounded-lg border border-outline-variant/30 border-l-2 border-l-tertiary-container bg-surface-dim p-3">
                <span className="text-label-sm text-outline">연차 잔여</span>
                <span className="text-headline-md font-semibold text-on-surface">
                  14
                  <span className="ml-1 text-sm font-normal text-outline">일</span>
                </span>
              </div>
              <div className="flex flex-col gap-1 rounded-lg border border-outline-variant/30 bg-surface-dim p-3">
                <span className="text-label-sm text-outline">병가</span>
                <span className="text-headline-md font-semibold text-on-surface">
                  5
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
