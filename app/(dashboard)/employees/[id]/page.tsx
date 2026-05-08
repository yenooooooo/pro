import {
  ArrowLeft,
  Briefcase,
  Building2,
  Cake,
  Calendar,
  IdCard,
  Landmark,
  Mail,
  Pencil,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { ResignButton } from "./_components/ResignButton";
import { AttendanceHistoryTab } from "./_components/attendance-history-tab";
import { PayrollHistoryTab } from "./_components/payroll-history-tab";
import { MarketComparison } from "./_components/market-comparison";
import { TurnoverRiskCard } from "./_components/turnover-risk-card";
import { cn } from "@/lib/utils/cn";
import { maskBankAccount } from "@/lib/utils/mask";
import { createClient } from "@/lib/supabase/server";

const TABS = [
  { key: "basic", label: "기본정보" },
  { key: "attendance", label: "근태이력" },
  { key: "payroll", label: "급여이력" },
  { key: "leave", label: "연차" },
  { key: "market", label: "시장 비교" },
  { key: "risk", label: "이직 위험" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  active: {
    label: "재직",
    tone: "border-primary-container/40 bg-primary-container/20 text-primary-electric",
  },
  leave: {
    label: "휴직",
    tone: "border-tertiary-container/40 bg-tertiary-container/20 text-tertiary-sky",
  },
  resigned: {
    label: "퇴사",
    tone: "border-error-container/40 bg-error-soft/10 text-error-soft",
  },
};

const DEPT_AVATAR_TONE: Record<string, "primary" | "secondary" | "error"> = {
  경영지원: "primary",
  영업: "secondary",
  개발: "error",
};

type EmployeeDetail = {
  id: string;
  employee_no: string;
  name: string;
  hire_date: string;
  resign_date: string | null;
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

type AttendanceHistoryRow = {
  work_date: string;
  regular_hours: number;
  overtime_hours: number;
  night_hours: number;
  holiday_hours: number;
};

type PayrollHistoryRow = {
  id: string;
  employee_id: string;
  pay_year: number;
  pay_month: number;
  base_salary: number;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  status: string;
};

export default async function EmployeeDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const supabase = createClient();
  const { data: emp } = await supabase
    .from("employees")
    .select(
      `id, employee_no, name, hire_date, resign_date, base_salary, dependents, status,
       bank_name, bank_account, email, phone, birth_date,
       department:departments(id, name),
       position:positions(id, name, level)`,
    )
    .eq("id", params.id)
    .maybeSingle()
    .returns<EmployeeDetail | null>();

  if (!emp) notFound();

  const tab: TabKey =
    (TABS.find((t) => t.key === searchParams.tab)?.key as TabKey | undefined) ?? "basic";

  const avatarTone = emp.department
    ? (DEPT_AVATAR_TONE[emp.department.name] ?? "primary")
    : "primary";
  const status = STATUS_LABEL[emp.status] ?? STATUS_LABEL.active;
  const isActive = emp.status === "active";

  let leaveBalance: LeaveBalance | null = null;
  let attendanceRows: AttendanceHistoryRow[] = [];
  let payrollRows: PayrollHistoryRow[] = [];

  if (tab === "leave") {
    const { data } = await supabase
      .from("leave_balances")
      .select("total_granted, total_used, remaining")
      .eq("employee_id", emp.id)
      .eq("year", 2026)
      .maybeSingle();
    leaveBalance = data;
  } else if (tab === "attendance") {
    // 최근 12개월
    const today = new Date();
    const since = new Date(today);
    since.setMonth(since.getMonth() - 12);
    const sinceStr = `${since.getFullYear()}-${String(since.getMonth() + 1).padStart(2, "0")}-01`;
    const { data } = await supabase
      .from("attendance")
      .select(
        "work_date, regular_hours, overtime_hours, night_hours, holiday_hours",
      )
      .eq("employee_id", emp.id)
      .gte("work_date", sinceStr)
      .order("work_date", { ascending: false })
      .returns<AttendanceHistoryRow[]>();
    attendanceRows = data ?? [];
  } else if (tab === "payroll") {
    const { data } = await supabase
      .from("payroll")
      .select(
        "id, employee_id, pay_year, pay_month, base_salary, gross_pay, total_deduction, net_pay, status",
      )
      .eq("employee_id", emp.id)
      .order("pay_year", { ascending: false })
      .order("pay_month", { ascending: false })
      .limit(12)
      .returns<PayrollHistoryRow[]>();
    payrollRows = data ?? [];
  }

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/employees"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        직원 목록으로
      </Link>

      {/* Header */}
      <div className="glass-panel flex flex-col gap-stack-md rounded-xl p-6 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <InitialsAvatar
            name={emp.name}
            size="lg"
            tone={avatarTone}
            className="h-16 w-16 border-2 border-outline-variant/40 text-base"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
                {emp.name}
              </h1>
              <span
                className={cn(
                  "inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                  status.tone,
                )}
              >
                {status.label}
              </span>
            </div>
            <p className="mt-1 text-body-md text-on-surface-variant">
              {emp.position?.name ?? "직급 미지정"} ·{" "}
              {emp.department?.name ?? "부서 미지정"}
            </p>
            <p className="text-label-sm tabular-nums text-outline">
              사번 {emp.employee_no}
            </p>
          </div>
        </div>
        {isActive ? (
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/employees/${emp.id}/edit`}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container-high px-4 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
            >
              <Pencil aria-hidden className="h-4 w-4" />
              편집
            </Link>
            <ResignButton employeeId={emp.id} employeeName={emp.name} />
          </div>
        ) : null}
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 overflow-x-auto border-b border-outline-variant/30">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/employees/${emp.id}?tab=${t.key}`}
            className={cn(
              "min-h-11 whitespace-nowrap border-b-2 px-4 py-2 text-label-sm transition-colors",
              tab === t.key
                ? "border-primary-electric text-primary-electric"
                : "border-transparent text-on-surface-variant hover:text-on-surface",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Tab content */}
      {tab === "basic" ? (
        <BasicInfoTab emp={emp} />
      ) : tab === "leave" ? (
        <LeaveTab balance={leaveBalance} />
      ) : tab === "attendance" ? (
        <AttendanceHistoryTab rows={attendanceRows} />
      ) : tab === "payroll" ? (
        <PayrollHistoryTab rows={payrollRows} />
      ) : tab === "market" ? (
        <MarketComparison
          employeeName={emp.name}
          baseSalary={emp.base_salary}
          department={emp.department?.name ?? null}
          position={emp.position?.name ?? null}
        />
      ) : (
        <TurnoverRiskCard employeeId={emp.id} />
      )}
    </div>
  );
}

function BasicInfoTab({ emp }: { emp: EmployeeDetail }) {
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-2">
      <Card title="개인 정보">
        <Row icon={IdCard} label="사번" value={emp.employee_no} mono />
        <Row icon={Mail} label="이메일" value={emp.email ?? "—"} />
        <Row icon={Phone} label="전화번호" value={emp.phone ?? "—"} mono />
        <Row icon={Cake} label="생년월일" value={emp.birth_date ?? "—"} mono />
      </Card>

      <Card title="조직 정보">
        <Row icon={Building2} label="부서" value={emp.department?.name ?? "—"} />
        <Row icon={Briefcase} label="직급" value={emp.position?.name ?? "—"} />
        <Row icon={Calendar} label="입사일" value={emp.hire_date} mono />
        {emp.resign_date ? (
          <Row icon={Calendar} label="퇴사일" value={emp.resign_date} mono />
        ) : null}
        <Row
          icon={Users}
          label="공제대상가족"
          value={`${emp.dependents}명`}
          mono
        />
      </Card>

      <Card title="재무 정보" className="md:col-span-2">
        <Row icon={Landmark} label="은행" value={emp.bank_name ?? "—"} />
        <Row
          icon={Wallet}
          label="계좌번호"
          value={maskBankAccount(emp.bank_account)}
          mono
        />
        <Row
          icon={Wallet}
          label="기본급 (월)"
          value={`${emp.base_salary.toLocaleString("ko-KR")}원`}
          mono
        />
      </Card>
    </div>
  );
}

function LeaveTab({ balance }: { balance: LeaveBalance | null }) {
  if (!balance) {
    return (
      <PlaceholderTab
        title="연차 잔여"
        message="2026년 연차 발생 기록이 없습니다."
      />
    );
  }
  return (
    <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
      <StatCard
        label="총 발생 (2026)"
        value={`${balance.total_granted}일`}
        tone="default"
      />
      <StatCard label="사용" value={`${balance.total_used}일`} tone="tertiary" />
      <StatCard label="잔여" value={`${balance.remaining}일`} tone="default" />
    </div>
  );
}

function PlaceholderTab({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="glass-panel rounded-xl p-12 text-center">
      <h3 className="text-headline-md font-semibold text-on-surface">{title}</h3>
      <p className="mt-2 text-body-md text-on-surface-variant">{message}</p>
    </div>
  );
}

function Card({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("glass-panel rounded-xl p-6", className)}>
      <h3 className="mb-4 text-headline-md font-semibold text-on-surface">
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: typeof IdCard;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-outline-variant/15 pb-3 last:border-0 last:pb-0">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Icon aria-hidden className="h-4 w-4 text-outline" />
        <span className="text-label-sm font-medium">{label}</span>
      </div>
      <span
        className={cn(
          "truncate pl-4 text-body-md text-on-surface",
          mono && "tabular-nums",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "tertiary";
}) {
  return (
    <div className="glass-panel rounded-xl p-6">
      <p className="text-label-sm font-medium text-on-surface-variant">{label}</p>
      <p
        className={cn(
          "mt-2 text-display-xl font-bold tabular-nums",
          tone === "tertiary" ? "text-tertiary-sky" : "text-on-surface",
        )}
      >
        {value}
      </p>
    </div>
  );
}
