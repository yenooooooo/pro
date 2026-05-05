import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Json } from "@/types/database";

const ACTION_LABEL: Record<string, { label: string; tone: "primary" | "success" | "warn" | "danger" | "neutral" }> = {
  "payroll.confirmed": { label: "급여 확정", tone: "primary" },
  "payroll.calculated": { label: "급여 계산", tone: "success" },
  "employee.created": { label: "직원 등록", tone: "success" },
  "employee.updated": { label: "직원 수정", tone: "neutral" },
  "employee.bank_changed": { label: "계좌 변경", tone: "warn" },
  "employee.resigned": { label: "퇴사 처리", tone: "danger" },
  "leave.granted": { label: "연차 부여", tone: "neutral" },
  "leave.requested": { label: "연차 신청", tone: "neutral" },
  "leave.approved": { label: "휴가 승인", tone: "success" },
  "leave.rejected": { label: "휴가 반려", tone: "warn" },
  "expense.deleted": { label: "지출 삭제", tone: "danger" },
  "vendor.deleted": { label: "거래처 삭제", tone: "danger" },
  "asset.disposed": { label: "자산 폐기", tone: "danger" },
  "closing.task_toggled": { label: "결산 토글", tone: "neutral" },
  "settings.rate_updated": { label: "요율 변경", tone: "warn" },
  "settings.closing_task_added": { label: "결산항목 추가", tone: "success" },
  "settings.closing_task_removed": { label: "결산항목 삭제", tone: "danger" },
  "report.exported": { label: "리포트 다운로드", tone: "primary" },
  "ai.ocr": { label: "AI 영수증 OCR", tone: "primary" },
  "ai.query": { label: "AI 자연어 질의", tone: "primary" },
  "approval.created": { label: "결재 발의", tone: "neutral" },
  "approval.approved": { label: "결재 승인", tone: "success" },
  "approval.rejected": { label: "결재 반려", tone: "warn" },
  "approval.cancelled": { label: "결재 취소", tone: "neutral" },
};

const TONE_CLASS: Record<string, string> = {
  primary: "bg-primary/10 text-primary border-primary/30",
  success: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  warn: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  neutral: "bg-surface-container-high text-on-surface-variant border-outline-variant",
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
      <div className="glass-panel p-12 text-center">
        <p className="text-body-md text-on-surface-variant">
          조회된 로그가 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full data-table text-data-tabular">
            <thead>
              <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
                <th className="px-4 py-3 text-left">시각</th>
                <th className="px-4 py-3 text-left">사용자</th>
                <th className="px-4 py-3 text-left">액션</th>
                <th className="px-4 py-3 text-left">대상</th>
                <th className="px-4 py-3 text-left">상세</th>
                <th className="px-4 py-3 text-left">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const meta = ACTION_LABEL[row.action] ?? {
                  label: row.action,
                  tone: "neutral" as const,
                };
                const tone = TONE_CLASS[meta.tone];
                return (
                  <tr
                    key={row.id}
                    className="border-b border-outline-variant/20 transition-colors hover:bg-primary/5"
                  >
                    <td className="px-4 py-3 align-top text-on-surface-variant">
                      {formatTimestamp(row.occurred_at)}
                    </td>
                    <td className="px-4 py-3 align-top text-on-surface">
                      {row.user_email ?? <span className="text-on-surface-variant">시스템</span>}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex h-7 items-center rounded-md border px-2 text-label-sm font-semibold ${tone}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top text-on-surface-variant">
                      <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-label-sm">
                        {row.entity_type}
                      </span>
                      {row.entity_id && (
                        <span className="ml-2 font-mono text-label-sm text-on-surface-variant/70">
                          {row.entity_id.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-on-surface-variant">
                      <MetadataPreview metadata={row.metadata} />
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-label-sm text-on-surface-variant/70">
                      {row.ip_address ?? "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-body-md text-on-surface-variant">
        <span>
          전체 {totalCount.toLocaleString("ko-KR")}건 · {page} / {totalPages} 페이지
        </span>
        <div className="flex gap-2">
          <PageLink
            page={page - 1}
            actionFilter={actionFilter}
            disabled={!hasPrev}
            label="이전"
            icon={<ChevronLeft className="h-4 w-4" />}
          />
          <PageLink
            page={page + 1}
            actionFilter={actionFilter}
            disabled={!hasNext}
            label="다음"
            icon={<ChevronRight className="h-4 w-4" />}
            iconRight
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
  icon,
  iconRight = false,
}: {
  page: number;
  actionFilter: string;
  disabled: boolean;
  label: string;
  icon: React.ReactNode;
  iconRight?: boolean;
}) {
  if (disabled) {
    return (
      <span className="inline-flex h-10 cursor-not-allowed items-center gap-1 rounded-lg border border-outline-variant/30 px-3 text-on-surface-variant/40">
        {!iconRight && icon}
        {label}
        {iconRight && icon}
      </span>
    );
  }
  const params = new URLSearchParams();
  if (actionFilter) params.set("action", actionFilter);
  if (page > 1) params.set("page", String(page));
  const href = `/audit-logs${params.toString() ? `?${params.toString()}` : ""}`;
  return (
    <Link
      href={href as never}
      className="inline-flex h-10 items-center gap-1 rounded-lg border border-outline-variant px-3 text-on-surface transition-colors hover:bg-primary/10"
    >
      {!iconRight && icon}
      {label}
      {iconRight && icon}
    </Link>
  );
}

function MetadataPreview({ metadata }: { metadata: Json }) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return <span className="text-on-surface-variant/60">—</span>;
  }
  const entries = Object.entries(metadata as Record<string, Json>).slice(0, 3);
  if (entries.length === 0) return <span className="text-on-surface-variant/60">—</span>;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-label-sm">
      {entries.map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1">
          <span className="text-on-surface-variant/60">{key}:</span>
          <span className="font-medium text-on-surface">{formatValue(value)}</span>
        </span>
      ))}
    </div>
  );
}

function formatValue(value: Json): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value.length > 30 ? value.slice(0, 30) + "…" : value;
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
