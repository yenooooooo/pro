import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type ActionRow = {
  id: string;
  occurred_at: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
};

const ACTION_META: Record<string, { label: string; tone: "ok" | "pend" | "rej" | "info" | "" }> = {
  "payroll.confirmed": { label: "급여 확정", tone: "ok" },
  "payroll.calculated": { label: "급여 계산", tone: "ok" },
  "employee.created": { label: "직원 등록", tone: "info" },
  "employee.updated": { label: "직원 수정", tone: "pend" },
  "employee.bank_changed": { label: "계좌 변경", tone: "pend" },
  "employee.resigned": { label: "퇴사 처리", tone: "rej" },
  "leave.granted": { label: "연차 부여", tone: "info" },
  "leave.requested": { label: "휴가 신청", tone: "" },
  "leave.approved": { label: "휴가 승인", tone: "ok" },
  "leave.rejected": { label: "휴가 반려", tone: "rej" },
  "expense.created": { label: "지출 등록", tone: "info" },
  "expense.updated": { label: "지출 수정", tone: "pend" },
  "expense.deleted": { label: "지출 삭제", tone: "rej" },
  "vendor.created": { label: "거래처 등록", tone: "info" },
  "vendor.updated": { label: "거래처 수정", tone: "pend" },
  "vendor.deleted": { label: "거래처 삭제", tone: "rej" },
  "asset.created": { label: "자산 등록", tone: "info" },
  "asset.updated": { label: "자산 수정", tone: "pend" },
  "asset.disposed": { label: "자산 폐기", tone: "rej" },
  "approval.created": { label: "결재 발의", tone: "info" },
  "approval.approved": { label: "결재 승인", tone: "ok" },
  "approval.rejected": { label: "결재 반려", tone: "rej" },
  "approval.cancelled": { label: "결재 취소", tone: "pend" },
  "closing.task_toggled": { label: "결산 토글", tone: "pend" },
  "settings.rate_updated": { label: "요율 변경", tone: "pend" },
  "settings.closing_task_added": { label: "결산항목 추가", tone: "info" },
  "settings.closing_task_removed": { label: "결산항목 삭제", tone: "rej" },
  "report.exported": { label: "리포트 다운로드", tone: "info" },
  "ai.ocr": { label: "AI 영수증 OCR", tone: "info" },
  "ai.query": { label: "AI 자연어 질의", tone: "info" },
  "year_end.saved": { label: "연말정산 입력", tone: "info" },
};

export default async function ActionsPage({
  searchParams,
}: {
  searchParams?: { page?: string };
}) {
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data, count, error } = await supabase
    .schema("chongmu")
    .from("audit_logs")
    .select(
      "id, occurred_at, user_email, action, entity_type, entity_id, metadata",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  const rows = (data ?? []) as unknown as ActionRow[];
  const totalCount = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M24</b>System · Actions
          </div>
          <h1 className="page-h">
            액션 <em>이력.</em>
          </h1>
          <p className="page-sub">시스템에서 수행된 사용자 액션 타임라인</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 border border-line bg-bg-1 p-4 font-mono text-[12px] text-[#E06B5F]">
          액션 조회 실패: {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="border border-line bg-bg-1/40 py-16 text-center">
          <p className="font-serif text-[22px] italic text-text-2">
            액션 이력이 없습니다.
          </p>
        </div>
      ) : (
        <>
          <section className="panel border border-line">
            <div className="panel-h">
              <div className="t font-serif">
                <em>Recent</em> · Actions
              </div>
              <div className="meta">{totalCount.toLocaleString("ko-KR")} 건</div>
            </div>
            <ul className="flex flex-col">
              {rows.map((row) => {
                const meta = ACTION_META[row.action] ?? {
                  label: row.action,
                  tone: "" as const,
                };
                const chipClass = meta.tone ? `chip ${meta.tone}` : "chip";
                return (
                  <li
                    key={row.id}
                    className="flex items-center gap-4 border-b border-line py-4 last:border-b-0"
                  >
                    <span className={chipClass}>
                      <i />
                      {meta.label}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[16px] text-text-1">
                        {meta.label}
                        <span className="ml-2 font-mono text-[11px] tracking-[0.05em] text-text-3">
                          {row.entity_type}
                          {row.entity_id
                            ? ` · ${row.entity_id.slice(0, 8)}…`
                            : ""}
                        </span>
                      </p>
                      <p className="mt-1 font-mono text-[10px] tracking-[0.05em] text-text-3">
                        {row.user_email ?? "시스템"}
                      </p>
                    </div>
                    <span className="ml-auto font-mono text-[10px] tracking-[0.05em] text-text-3">
                      {formatTime(row.occurred_at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Pagination */}
          <div className="mt-6 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            <span>
              전체 {totalCount.toLocaleString("ko-KR")} 건 · {page} / {totalPages}
            </span>
            <div className="flex gap-2">
              {hasPrev ? (
                <Link href={`/actions?page=${page - 1}` as never} className="btn">
                  ← 이전
                </Link>
              ) : (
                <span className="btn cursor-not-allowed opacity-40">← 이전</span>
              )}
              {hasNext ? (
                <Link href={`/actions?page=${page + 1}` as never} className="btn">
                  다음 →
                </Link>
              ) : (
                <span className="btn cursor-not-allowed opacity-40">다음 →</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}
