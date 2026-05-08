import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Plane,
  Calendar,
  MapPin,
  User,
  Coins,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TripExpenseManager } from "./_expense-manager";
import { TripActions } from "./_actions";
import { getCurrentUserRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  requested: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  approved: "border-tertiary/40 bg-tertiary/10 text-tertiary",
  in_progress: "border-primary-electric/40 bg-primary-electric/10 text-primary-electric",
  settled: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  reimbursed: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-error-soft/40 bg-error-soft/10 text-error-soft",
  cancelled: "border-outline-variant/40 bg-surface-container-high text-on-surface-variant",
};

const STATUS_LABEL: Record<string, string> = {
  requested: "신청",
  approved: "승인",
  in_progress: "진행 중",
  settled: "정산 완료",
  reimbursed: "환급 완료",
  rejected: "반려",
  cancelled: "취소",
};

type Trip = {
  id: string;
  title: string;
  destination: string;
  purpose: string | null;
  start_date: string;
  end_date: string;
  budget: number;
  status: string;
  total_settled: number;
  reimbursement_amount: number | null;
  notes: string | null;
  employees: { id: string; name: string; employee_no: string | null } | null;
};

type Expense = {
  id: string;
  expense_date: string;
  category: string;
  description: string | null;
  vendor: string | null;
  amount: number;
  vat: number;
  payment_method: string;
};

export default async function BusinessTripDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: trip } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_trips" as any)
    .select(
      "id, title, destination, purpose, start_date, end_date, budget, status, total_settled, reimbursement_amount, notes, employees:employee_id(id, name, employee_no)",
    )
    .eq("id", params.id)
    .maybeSingle();

  if (!trip) notFound();

  const t = trip as unknown as Trip;

  // 권한 판단
  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const userRole = await getCurrentUserRole();
  const isAdmin = userRole === "admin";
  // 출장자 본인이거나 admin
  const { data: ownerEmp } = t.employees
    ? await supabase
        .schema("chongmu")
        .from("employees")
        .select("email")
        .eq("id", t.employees.id)
        .maybeSingle()
    : { data: null };
  const isOwner = (ownerEmp as { email?: string } | null)?.email === currentUser?.email;
  const isOwnerOrAdmin = isOwner || isAdmin;

  const { data: expenseRows } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("trip_expenses" as any)
    .select(
      "id, expense_date, category, description, vendor, amount, vat, payment_method",
    )
    .eq("trip_id", params.id)
    .order("expense_date", { ascending: true });

  const expenses = (expenseRows as unknown as Expense[]) ?? [];

  const tone = STATUS_TONE[t.status] ?? STATUS_TONE.requested;
  const statusLabel = STATUS_LABEL[t.status] ?? t.status;

  const days = Math.ceil(
    (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) /
      (1000 * 60 * 60 * 24),
  ) + 1;

  const remaining = t.budget - t.total_settled;
  const utilizationPct =
    t.budget > 0 ? Math.min(100, Math.round((t.total_settled / t.budget) * 100)) : 0;

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/business-trips"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        출장 목록
      </Link>

      {/* 헤더 */}
      <header className="glass-panel rounded-xl p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Plane aria-hidden className="h-5 w-5 text-primary-electric" />
              <span
                className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
              >
                {statusLabel}
              </span>
            </div>
            <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
              {t.title}
            </h1>
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-body-md text-on-surface-variant">
              <span className="inline-flex items-center gap-1">
                <User aria-hidden className="h-4 w-4" />
                {t.employees?.name ?? "—"}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin aria-hidden className="h-4 w-4" />
                {t.destination}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar aria-hidden className="h-4 w-4" />
                {t.start_date} ~ {t.end_date} ({days}일)
              </span>
            </div>
            {t.purpose ? (
              <p className="mt-3 rounded-lg border border-outline-variant/20 bg-surface-container-low p-3 text-body-md text-on-surface-variant">
                {t.purpose}
              </p>
            ) : null}
          </div>

          <TripActions
            tripId={t.id}
            status={t.status}
            budget={t.budget}
            totalSettled={t.total_settled}
            isOwnerOrAdmin={isOwnerOrAdmin}
            isAdmin={isAdmin}
          />
        </div>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <div className="glass-panel rounded-xl p-5">
          <div className="mb-1 flex items-center gap-2">
            <Coins aria-hidden className="h-4 w-4 text-on-surface-variant" />
            <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
              예산
            </p>
          </div>
          <p className="text-headline-md font-bold tabular-nums text-on-surface">
            {t.budget.toLocaleString("ko-KR")}원
          </p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
            정산액
          </p>
          <p
            className={`mt-1 text-headline-md font-bold tabular-nums ${
              t.total_settled > t.budget ? "text-error-soft" : "text-primary-electric"
            }`}
          >
            {t.total_settled.toLocaleString("ko-KR")}원
          </p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-surface-container-high">
            <div
              className={`h-full rounded-full ${
                utilizationPct > 100 ? "bg-error-soft" : "bg-primary-electric"
              }`}
              style={{ width: `${utilizationPct}%` }}
            />
          </div>
          <p className="mt-1 text-label-sm tabular-nums text-on-surface-variant">
            예산 대비 {utilizationPct}%
          </p>
        </div>
        <div className="glass-panel rounded-xl p-5">
          <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
            {remaining >= 0 ? "잔여 예산" : "초과 사용"}
          </p>
          <p
            className={`mt-1 text-headline-md font-bold tabular-nums ${
              remaining >= 0 ? "text-emerald-300" : "text-error-soft"
            }`}
          >
            {remaining >= 0 ? "" : "-"}
            {Math.abs(remaining).toLocaleString("ko-KR")}원
          </p>
          {t.reimbursement_amount !== null ? (
            <p className="mt-2 text-label-sm text-on-surface-variant">
              {t.reimbursement_amount > 0
                ? `🟢 ${t.reimbursement_amount.toLocaleString("ko-KR")}원 직원 환급`
                : t.reimbursement_amount < 0
                  ? `🟠 ${Math.abs(t.reimbursement_amount).toLocaleString("ko-KR")}원 회사 환수`
                  : "정확히 일치"}
            </p>
          ) : null}
        </div>
      </div>

      {/* 영수증 매니저 (일괄 OCR + 수동 등록 + 표) */}
      <TripExpenseManager
        tripId={t.id}
        expenses={expenses}
        canEdit={t.status !== "settled" && t.status !== "reimbursed"}
      />
    </div>
  );
}
