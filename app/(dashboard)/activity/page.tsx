import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils/cn";

export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  occurred_at: string;
  user_email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown> | null;
};

type ActionMeta = { label: string; chip: string };

const ACTION_META: Record<string, ActionMeta> = {
  "payroll.confirmed": { label: "급여 확정", chip: "chip ok" },
  "payroll.calculated": { label: "급여 계산 실행", chip: "chip info" },
  "employee.created": { label: "신규 직원 등록", chip: "chip ok" },
  "employee.updated": { label: "직원 정보 수정", chip: "chip" },
  "employee.bank_changed": { label: "직원 계좌 변경", chip: "chip pend" },
  "employee.resigned": { label: "직원 퇴사 처리", chip: "chip rej" },
  "leave.granted": { label: "연차 부여", chip: "chip info" },
  "leave.requested": { label: "휴가 신청", chip: "chip" },
  "leave.approved": { label: "휴가 승인", chip: "chip ok" },
  "leave.rejected": { label: "휴가 반려", chip: "chip pend" },
  "approval.created": { label: "결재 발의", chip: "chip info" },
  "approval.approved": { label: "결재 승인", chip: "chip ok" },
  "approval.rejected": { label: "결재 반려", chip: "chip pend" },
  "approval.cancelled": { label: "결재 취소", chip: "chip" },
  "expense.created": { label: "지출 등록", chip: "chip ok" },
  "expense.updated": { label: "지출 수정", chip: "chip" },
  "expense.deleted": { label: "지출 삭제", chip: "chip rej" },
  "vendor.created": { label: "거래처 등록", chip: "chip ok" },
  "vendor.updated": { label: "거래처 수정", chip: "chip" },
  "vendor.deleted": { label: "거래처 삭제", chip: "chip rej" },
  "asset.created": { label: "자산 등록", chip: "chip ok" },
  "asset.updated": { label: "자산 수정", chip: "chip" },
  "asset.disposed": { label: "자산 폐기", chip: "chip rej" },
  "closing.task_toggled": { label: "결산 항목 토글", chip: "chip" },
  "settings.rate_updated": { label: "요율 변경", chip: "chip pend" },
  "settings.closing_task_added": { label: "결산항목 추가", chip: "chip ok" },
  "settings.closing_task_removed": { label: "결산항목 삭제", chip: "chip rej" },
  "year_end.saved": { label: "연말정산 입력", chip: "chip info" },
  "report.exported": { label: "리포트 다운로드", chip: "chip info" },
  "ai.ocr": { label: "AI 영수증 OCR", chip: "chip info" },
  "ai.query": { label: "AI 자연어 질의", chip: "chip info" },
};

const PAGE_SIZE = 30;

const BUCKET_ORDER = ["오늘", "어제", "이번 주", "이전"] as const;

export default async function ActivityPage({
  searchParams,
}: {
  searchParams?: { page?: string; user?: string };
}) {
  const t = await getTranslations("activity");
  const supabase = createClient();
  const page = Math.max(1, Number(searchParams?.page) || 1);
  const userFilter = searchParams?.user ?? "";
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .schema("chongmu")
    .from("audit_logs")
    .select(
      "id, occurred_at, user_email, action, entity_type, entity_id, metadata",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (userFilter) query = query.eq("user_email", userFilter);

  const { data: rows, count } = await query;

  // 활동자 목록 (필터용)
  const { data: distinctUsers } = await supabase
    .schema("chongmu")
    .from("audit_logs")
    .select("user_email")
    .not("user_email", "is", null)
    .limit(50);
  const users = Array.from(
    new Set(
      (distinctUsers ?? [])
        .map((u) => u.user_email)
        .filter((e): e is string => Boolean(e)),
    ),
  ).sort();

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  // 시간순 그룹화 (오늘/어제/이번 주/이전)
  const grouped = new Map<string, AuditRow[]>();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  for (const row of (rows ?? []) as AuditRow[]) {
    const date = row.occurred_at.slice(0, 10);
    let bucket: string;
    if (date === today) bucket = "오늘";
    else if (date === yesterday) bucket = "어제";
    else if (date >= weekAgo) bucket = "이번 주";
    else bucket = "이전";
    const cur = grouped.get(bucket) ?? [];
    cur.push(row);
    grouped.set(bucket, cur);
  }

  const empty = (rows ?? []).length === 0;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M19</b>Operations · Activity Feed
          </div>
          <h1 className="page-h">
            활동 <em>피드.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <select
            name="user"
            defaultValue={userFilter}
            className="h-9 min-w-[180px] border border-line-2 bg-bg px-3 font-mono text-[12px] text-text-1 focus:border-gold focus:outline-none"
          >
            <option value="">전체 사용자</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button type="submit" className="btn btn-primary">
            적용
          </button>
        </form>
      </header>

      {empty ? (
        <div className="border border-line bg-bg-1/40 py-16 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
          활동 기록이 없습니다
        </div>
      ) : (
        <>
          {BUCKET_ORDER.map((bucket) => {
            const items = grouped.get(bucket);
            if (!items || items.length === 0) return null;
            return (
              <section key={bucket} className="mb-9">
                <div className="section-rule">
                  <span className="l">
                    <b>·</b>
                    {bucket}
                    <span className="ml-3 text-text-3">{items.length}건</span>
                  </span>
                  <span className="line" />
                </div>
                <ul className="border-t border-line">
                  {items.map((row) => (
                    <ActivityItem key={row.id} row={row} />
                  ))}
                </ul>
              </section>
            );
          })}

          {/* 페이지네이션 */}
          <div className="mt-6 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:flex-row sm:items-center">
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
              전체 {(count ?? 0).toLocaleString("ko-KR")}건 · {page} /{" "}
              {totalPages}
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={
                    `/activity?page=${page - 1}${userFilter ? `&user=${userFilter}` : ""}` as never
                  }
                  className="btn"
                >
                  ← 이전
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={
                    `/activity?page=${page + 1}${userFilter ? `&user=${userFilter}` : ""}` as never
                  }
                  className="btn"
                >
                  다음 →
                </Link>
              ) : null}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ActivityItem({ row }: { row: AuditRow }) {
  const meta: ActionMeta = ACTION_META[row.action] ?? {
    label: row.action,
    chip: "chip",
  };
  const time = new Date(row.occurred_at);
  const timeStr =
    String(time.getHours()).padStart(2, "0") +
    ":" +
    String(time.getMinutes()).padStart(2, "0");

  // metadata 에서 핵심만 추출
  const metaPreview = row.metadata
    ? Object.entries(row.metadata)
        .slice(0, 2)
        .map(([k, v]) => `${k}: ${formatValue(v)}`)
        .join(" · ")
    : "";

  return (
    <li
      className={cn(
        "flex items-center gap-5 border-b border-line px-1 py-4 transition-colors hover:bg-bg-1",
      )}
    >
      <span className="w-14 shrink-0 font-mono text-[11px] tabular-nums tracking-[0.05em] text-gold">
        {timeStr}
      </span>
      <span className={cn(meta.chip, "shrink-0")}>
        <i />
        {meta.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] text-text-1">
          {row.user_email ?? "시스템"}
          {row.entity_type ? (
            <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
              {row.entity_type}
            </span>
          ) : null}
        </p>
        {metaPreview ? (
          <p className="mt-[2px] truncate font-mono text-[10px] tracking-[0.05em] text-text-3">
            {metaPreview}
          </p>
        ) : null}
      </div>
    </li>
  );
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "number")
    return v >= 1000 ? v.toLocaleString("ko-KR") : String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "string") return v.length > 30 ? v.slice(0, 30) + "…" : v;
  if (Array.isArray(v)) return `[${v.length}]`;
  return "{…}";
}
