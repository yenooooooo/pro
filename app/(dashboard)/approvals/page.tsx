import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import {
  APPROVAL_KIND_LABEL,
  APPROVAL_STATUS_LABEL,
  label,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

const STATUS_CHIP: Record<string, string> = {
  draft: "chip",
  pending: "chip pend",
  approved: "chip ok",
  rejected: "chip rej",
  cancelled: "chip",
};

type Row = {
  id: string;
  kind: string;
  title: string;
  amount: number | null;
  status: string;
  current_step: number;
  total_steps?: number | null;
  requester_email: string | null;
  created_at: string;
};

export default async function ApprovalsPage() {
  const t = await getTranslations("approvals");
  const supabase = createClient();
  const { data: rows } = await supabase
    .schema("chongmu")
    .from("approval_requests")
    .select(
      "id, kind, title, amount, status, current_step, total_steps, requester_email, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Row[]>();

  const list = rows ?? [];

  // KPI 집계
  const pendingCount = list.filter((r) => r.status === "pending").length;
  const draftCount = list.filter((r) => r.status === "draft").length;
  const approvedCount = list.filter((r) => r.status === "approved").length;
  const rejectedCount = list.filter((r) => r.status === "rejected").length;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M10</b>Flow · Approvals
          </div>
          <h1 className="page-h">
            결재 <em>플로우.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={"/approvals/new" as never}
            className="btn btn-primary"
          >
            + {t("create")}
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-2 xl:grid-cols-4">
        <div className="kpi-card">
          <div className="kpi-l">대기</div>
          <div className={cn("kpi-v", pendingCount > 0 ? "warn" : "")}>
            {pendingCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>{pendingCount > 0 ? "결재 진행 중" : "대기 없음"}</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">내 결재</div>
          <div className="kpi-v">
            {draftCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>임시저장 / 발의 예정</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">승인됨</div>
          <div className="kpi-v">
            <span className="text-[#6BCB8A]">
              {approvedCount.toLocaleString("ko-KR")}
            </span>
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>최근 50건 기준</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">반려됨</div>
          <div className={cn("kpi-v", rejectedCount > 0 ? "danger" : "")}>
            {rejectedCount.toLocaleString("ko-KR")}
            <span className="ml-2 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>{rejectedCount > 0 ? "검토 필요" : "이상 없음"}</span>
          </div>
        </div>
      </div>

      {/* ===== Approval list ===== */}
      <section className="panel">
        <div className="panel-h">
          <div className="t font-serif">
            결재 <em>이력</em>
          </div>
          <div className="meta">최근 {list.length}건</div>
        </div>

        {list.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center">
            <p className="font-serif text-[20px] italic text-text-1">
              결재 이력이 없습니다
            </p>
            <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              상단 &quot;{t("create")}&quot; 버튼으로 시작하세요.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[880px]">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>제목</th>
                  <th className="text-right">금액</th>
                  <th>발의자</th>
                  <th className="text-center">단계</th>
                  <th className="text-center">상태</th>
                  <th>발의일</th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const chipClass = STATUS_CHIP[r.status] ?? "chip";
                  const isResolved =
                    r.status === "approved" || r.status === "rejected";
                  const stepText = isResolved
                    ? "—"
                    : r.total_steps
                      ? `${r.current_step}/${r.total_steps}`
                      : String(r.current_step);
                  return (
                    <tr key={r.id}>
                      <td>
                        <span className="chip">
                          {label(APPROVAL_KIND_LABEL, r.kind)}
                        </span>
                      </td>
                      <td>
                        <Link
                          href={`/approvals/${r.id}` as never}
                          className="text-text-1 transition-colors hover:text-gold"
                        >
                          {r.title}
                        </Link>
                      </td>
                      <td className="n">
                        {r.amount
                          ? `${r.amount.toLocaleString("ko-KR")}원`
                          : "—"}
                      </td>
                      <td className="text-text-2">
                        {r.requester_email ?? "—"}
                      </td>
                      <td className="text-center font-mono text-[12px] text-text-2 tabular-nums">
                        {stepText}
                      </td>
                      <td className="text-center">
                        <span className={chipClass}>
                          {r.status !== "draft" && r.status !== "cancelled" ? (
                            <i />
                          ) : null}
                          {label(APPROVAL_STATUS_LABEL, r.status)}
                        </span>
                      </td>
                      <td className="font-mono text-[12px] text-text-3">
                        {r.created_at.slice(0, 10)}
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
