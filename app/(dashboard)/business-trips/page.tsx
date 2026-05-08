import Link from "next/link";
import { Plane, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

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
  start_date: string;
  end_date: string;
  budget: number;
  status: string;
  total_settled: number;
  reimbursement_amount: number | null;
  employees: { name: string; employee_no: string | null } | null;
};

export default async function BusinessTripsPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("business_trips" as any)
    .select(
      "id, title, destination, start_date, end_date, budget, status, total_settled, reimbursement_amount, employees:employee_id(name, employee_no)",
    )
    .order("start_date", { ascending: false });

  const trips = (rows as unknown as Trip[]) ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trips.filter((t) => t.start_date >= today && t.status !== "cancelled");
  const totalUtilized = trips
    .filter((t) => t.status === "settled" || t.status === "reimbursed")
    .reduce((s, t) => s + t.total_settled, 0);

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <Plane aria-hidden className="h-4 w-4" />
            Business Trip Settlement
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            출장 정산
          </h1>
          <p className="text-body-md text-on-surface-variant">
            출장 신청부터 영수증 일괄 OCR, 자동 정산까지. AI 가 사진만으로 카테고리(교통/숙박/식비)를 분류합니다.
          </p>
        </div>
        <Link
          href={"/business-trips/new" as never}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus aria-hidden className="h-4 w-4" />
          출장 신청
        </Link>
      </header>

      {/* KPI */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KpiCard label="전체 출장" value={`${trips.length} 건`} />
        <KpiCard label="다가오는 출장" value={`${upcoming.length} 건`} tone="primary" />
        <KpiCard
          label="누적 정산 금액"
          value={`${totalUtilized.toLocaleString("ko-KR")}원`}
          tone="success"
        />
      </div>

      {/* 목록 */}
      {trips.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-headline-md font-semibold text-on-surface">
            등록된 출장이 없습니다
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            우상단 &quot;출장 신청&quot; 버튼으로 시작하세요.
          </p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-data-tabular">
              <thead>
                <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-left">행선지</th>
                  <th className="px-4 py-3 text-left">출장자</th>
                  <th className="px-4 py-3 text-left">기간</th>
                  <th className="px-4 py-3 text-right">예산</th>
                  <th className="px-4 py-3 text-right">정산액</th>
                  <th className="px-4 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((t) => {
                  const tone = STATUS_TONE[t.status] ?? STATUS_TONE.requested;
                  const days = Math.ceil(
                    (new Date(t.end_date).getTime() - new Date(t.start_date).getTime()) /
                      (1000 * 60 * 60 * 24),
                  ) + 1;
                  return (
                    <tr
                      key={t.id}
                      className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/business-trips/${t.id}` as never}
                          className="font-medium text-on-surface hover:text-primary-electric"
                        >
                          {t.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {t.destination}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        {t.employees?.name ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-label-sm text-on-surface-variant tabular-nums">
                        {t.start_date} ~ {t.end_date} ({days}일)
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                        {t.budget.toLocaleString("ko-KR")}원
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        <span
                          className={
                            t.total_settled > t.budget
                              ? "text-error-soft"
                              : "text-on-surface"
                          }
                        >
                          {t.total_settled.toLocaleString("ko-KR")}원
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
                        >
                          {STATUS_LABEL[t.status] ?? t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "primary" | "success";
}) {
  const colorMap = {
    primary: "text-primary-electric",
    success: "text-emerald-300",
  };
  return (
    <div className="glass-panel rounded-xl p-5">
      <p className="text-label-sm uppercase tracking-widest text-on-surface-variant">
        {label}
      </p>
      <p
        className={`mt-2 text-headline-md font-bold tabular-nums ${tone ? colorMap[tone] : "text-on-surface"}`}
      >
        {value}
      </p>
    </div>
  );
}
