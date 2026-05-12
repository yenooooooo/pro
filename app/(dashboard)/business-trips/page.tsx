import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  requested: "chip pend",
  approved: "chip info",
  in_progress: "chip info",
  settled: "chip ok",
  reimbursed: "chip ok",
  rejected: "chip rej",
  cancelled: "chip",
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
  const t = await getTranslations("business_trips");
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
  const pendingCount = trips.filter(
    (t) => t.status === "requested" || t.status === "in_progress",
  ).length;
  const totalCost = trips
    .filter((t) => t.status === "settled" || t.status === "reimbursed")
    .reduce((s, t) => s + t.total_settled, 0);

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M13</b>Records · Trips
          </div>
          <h1 className="page-h">
            출장 <em>정산.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/business-trips/new" as never} className="btn btn-primary">
            + 출장 신청
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <KPI label="총 출장 건수" value={String(trips.length)} suffix="건" />
        <KPI
          label="정산 대기"
          value={String(pendingCount)}
          suffix="건"
          tone="warn"
          subtext={`다가오는 ${upcoming.length}건`}
        />
        <KPI
          label="총 비용"
          value={totalCost.toLocaleString("ko-KR")}
          prefix="₩"
          subtext="정산·환급 완료 누적"
        />
      </div>

      {/* ===== 목록 ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            출장 <em>내역</em>
          </div>
          <div className="meta">{trips.length}건</div>
        </div>

        {trips.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center">
            <p className="font-serif text-[20px] text-text-1">
              등록된 출장이 없습니다
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              우상단 &quot;출장 신청&quot; 버튼으로 시작하세요.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[920px]">
              <thead>
                <tr>
                  <th>제목</th>
                  <th>행선지</th>
                  <th>출장자</th>
                  <th>기간</th>
                  <th className="text-right">예산</th>
                  <th className="text-right">정산액</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {trips.map((trip) => {
                  const chipClass = STATUS_CHIP[trip.status] ?? "chip pend";
                  const days =
                    Math.ceil(
                      (new Date(trip.end_date).getTime() -
                        new Date(trip.start_date).getTime()) /
                        (1000 * 60 * 60 * 24),
                    ) + 1;
                  const isUpcoming =
                    trip.start_date >= today && trip.status !== "cancelled";
                  const overBudget = trip.total_settled > trip.budget;
                  return (
                    <tr key={trip.id}>
                      <td>
                        <Link
                          href={`/business-trips/${trip.id}` as never}
                          className={cn(
                            "text-text-1 hover:text-gold",
                            isUpcoming && "italic text-gold",
                          )}
                        >
                          {trip.title}
                        </Link>
                      </td>
                      <td>{trip.destination}</td>
                      <td>{trip.employees?.name ?? "—"}</td>
                      <td className="font-mono text-[12px] text-text-2">
                        {trip.start_date} ~ {trip.end_date}
                        <span className="ml-1 text-text-3">({days}일)</span>
                      </td>
                      <td className="n">
                        ₩{trip.budget.toLocaleString("ko-KR")}
                      </td>
                      <td
                        className={cn(
                          "n",
                          overBudget ? "text-[#E06B5F]" : "text-text-1",
                        )}
                      >
                        ₩{trip.total_settled.toLocaleString("ko-KR")}
                      </td>
                      <td>
                        <span className={chipClass}>
                          {STATUS_LABEL[trip.status] ?? trip.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
 * Subcomponents
 * ============================================================ */

function KPI({
  label,
  value,
  prefix,
  suffix,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subtext?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : "text-text-1";
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {prefix ? <span className="cur">{prefix}</span> : null}
        {value}
        {suffix ? (
          <span className="ml-2 text-[16px] text-text-3">{suffix}</span>
        ) : null}
      </div>
      {subtext ? (
        <div className="kpi-meta">
          <span>{subtext}</span>
        </div>
      ) : null}
    </div>
  );
}
