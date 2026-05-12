import Link from "next/link";
import type { Json } from "@/types/database";

const ACTION_LABEL: Record<string, { label: string; tone: "ok" | "pend" | "rej" | "info" | "" }> = {
  "payroll.confirmed": { label: "급여 확정", tone: "ok" },
  "payroll.calculated": { label: "급여 계산", tone: "ok" },
  "employee.created": { label: "직원 등록", tone: "info" },
  "employee.updated": { label: "직원 수정", tone: "pend" },
  "employee.bank_changed": { label: "계좌 변경", tone: "pend" },
  "employee.resigned": { label: "퇴사 처리", tone: "rej" },
  "leave.granted": { label: "연차 부여", tone: "info" },
  "leave.requested": { label: "연차 신청", tone: "" },
  "leave.approved": { label: "휴가 승인", tone: "ok" },
  "leave.rejected": { label: "휴가 반려", tone: "rej" },
  "expense.deleted": { label: "지출 삭제", tone: "rej" },
  "vendor.deleted": { label: "거래처 삭제", tone: "rej" },
  "asset.disposed": { label: "자산 폐기", tone: "rej" },
  "closing.task_toggled": { label: "결산 토글", tone: "pend" },
  "settings.rate_updated": { label: "요율 변경", tone: "pend" },
  "settings.closing_task_added": { label: "결산항목 추가", tone: "info" },
  "settings.closing_task_removed": { label: "결산항목 삭제", tone: "rej" },
  "report.exported": { label: "리포트 다운로드", tone: "info" },
  "ai.ocr": { label: "AI 영수증 OCR", tone: "info" },
  "ai.query": { label: "AI 자연어 질의", tone: "info" },
  "approval.created": { label: "결재 발의", tone: "info" },
  "approval.approved": { label: "결재 승인", tone: "ok" },
  "approval.rejected": { label: "결재 반려", tone: "rej" },
  "approval.cancelled": { label: "결재 취소", tone: "pend" },
  "year_end.saved": { label: "연말정산 입력", tone: "info" },
  "vendor.created": { label: "거래처 등록", tone: "info" },
  "vendor.updated": { label: "거래처 수정", tone: "pend" },
  "asset.created": { label: "자산 등록", tone: "info" },
  "asset.updated": { label: "자산 수정", tone: "pend" },
  "expense.created": { label: "지출 등록", tone: "info" },
  "expense.updated": { label: "지출 수정", tone: "pend" },
};

type Row = {
  id: string;
  occurred_at: string;
  user_id: string | null;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  ip_address: string | null;
};

export function AuditLogsTable({
  rows,
  totalCount,
  page,
  pageSize,
  actionFilter,
}: {
  rows: Row[];
  totalCount: number;
  page: number;
  pageSize: number;
  actionFilter: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  if (rows.length === 0) {
    return (
      <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
        조회된 로그가 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="panel border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            <em>Audit</em> · Trail
          </div>
          <div className="meta">{totalCount.toLocaleString("ko-KR")} 건</div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="tbl min-w-[920px]">
            <thead>
              <tr>
                <th>시간</th>
                <th>사용자</th>
                <th>행위</th>
                <th>대상</th>
                <th>상세</th>
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = ACTION_LABEL[row.action] ?? {
                  label: row.action,
                  tone: "" as const,
                };
                const chipClass = meta.tone ? `chip ${meta.tone}` : "chip";
                return (
                  <tr key={row.id}>
                    <td className="font-mono text-[12px] text-text-3">
                      {formatTimestamp(row.occurred_at)}
                    </td>
                    <td>
                      {row.user_email ?? (
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
                          시스템
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={chipClass}>
                        <i />
                        {meta.label}
                      </span>
                    </td>
                    <td>
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-2">
                        {row.entity_type}
                      </span>
                      {row.entity_id && (
                        <span className="ml-2 font-mono text-[10px] text-text-3">
                          {row.entity_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td>
                      <MetadataPreview metadata={row.metadata} />
                    </td>
                    <td className="font-mono text-[11px] text-text-3">
                      {row.ip_address ?? "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
        <span>
          전체 {totalCount.toLocaleString("ko-KR")} 건 · {page} / {totalPages}
        </span>
        <div className="flex gap-2">
          <PageLink
            page={page - 1}
            actionFilter={actionFilter}
            disabled={!hasPrev}
            label="← 이전"
          />
          <PageLink
            page={page + 1}
            actionFilter={actionFilter}
            disabled={!hasNext}
            label="다음 →"
          />
        </div>
      </div>
    </div>
  );
}

function PageLink({
  page,
  actionFilter,
  disabled,
  label,
}: {
  page: number;
  actionFilter: string;
  disabled: boolean;
  label: string;
}) {
  if (disabled) {
    return (
      <span className="btn cursor-not-allowed opacity-40">{label}</span>
    );
  }
  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  if (page > 1) params.set("page", String(page));
  const href = `/audit-logs${params.toString() ? `?${params.toString()}` : ""}`;
  return (
    <Link href={href as never} className="btn">
      {label}
    </Link>
  );
}

function MetadataPreview({ metadata }: { metadata: Json }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return <span className="font-mono text-[11px] text-text-3">—</span>;
  }
  const entries = Object.entries(metadata as Record<string, Json>).slice(0, 3);
  if (entries.length === 0)
    return <span className="font-mono text-[11px] text-text-3">—</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[11px]">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1">
          <span className="text-text-3">{key}:</span>
          <span className="text-text-1">{formatValue(value)}</span>
        </span>
      ))}
    </div>
  );
}

function formatValue(value: Json): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string")
    return value.length > 30 ? value.slice(0, 30) + "…" : value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return `[${value.length}]`;
  return "{…}";
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}
