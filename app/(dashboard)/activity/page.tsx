import Link from "next/link";
import {
  Activity,
  Coins,
  Receipt,
  CalendarCheck,
  FileSignature,
  UserPlus,
  UserMinus,
  Package,
  Handshake,
  Sparkles,
} from "lucide-react";
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

const ACTION_META: Record<
  string,
  { label: string; icon: typeof Activity; tone: string }
> = {
  "payroll.confirmed": {
    label: "급여 확정",
    icon: Coins,
    tone: "text-emerald-300",
  },
  "payroll.calculated": {
    label: "급여 계산 실행",
    icon: Coins,
    tone: "text-tertiary",
  },
  "employee.created": {
    label: "신규 직원 등록",
    icon: UserPlus,
    tone: "text-emerald-300",
  },
  "employee.updated": {
    label: "직원 정보 수정",
    icon: UserPlus,
    tone: "text-on-surface-variant",
  },
  "employee.bank_changed": {
    label: "직원 계좌 변경",
    icon: UserPlus,
    tone: "text-amber-300",
  },
  "employee.resigned": {
    label: "직원 퇴사 처리",
    icon: UserMinus,
    tone: "text-error-soft",
  },
  "leave.granted": {
    label: "연차 부여",
    icon: CalendarCheck,
    tone: "text-tertiary",
  },
  "leave.requested": {
    label: "휴가 신청",
    icon: CalendarCheck,
    tone: "text-on-surface-variant",
  },
  "leave.approved": {
    label: "휴가 승인",
    icon: CalendarCheck,
    tone: "text-emerald-300",
  },
  "leave.rejected": {
    label: "휴가 반려",
    icon: CalendarCheck,
    tone: "text-amber-300",
  },
  "approval.created": {
    label: "결재 발의",
    icon: FileSignature,
    tone: "text-tertiary",
  },
  "approval.approved": {
    label: "결재 승인",
    icon: FileSignature,
    tone: "text-emerald-300",
  },
  "approval.rejected": {
    label: "결재 반려",
    icon: FileSignature,
    tone: "text-amber-300",
  },
  "approval.cancelled": {
    label: "결재 취소",
    icon: FileSignature,
    tone: "text-on-surface-variant",
  },
  "expense.created": {
    label: "지출 등록",
    icon: Receipt,
    tone: "text-emerald-300",
  },
  "expense.updated": {
    label: "지출 수정",
    icon: Receipt,
    tone: "text-on-surface-variant",
  },
  "expense.deleted": {
    label: "지출 삭제",
    icon: Receipt,
    tone: "text-error-soft",
  },
  "vendor.created": {
    label: "거래처 등록",
    icon: Handshake,
    tone: "text-emerald-300",
  },
  "vendor.updated": {
    label: "거래처 수정",
    icon: Handshake,
    tone: "text-on-surface-variant",
  },
  "vendor.deleted": {
    label: "거래처 삭제",
    icon: Handshake,
    tone: "text-error-soft",
  },
  "asset.created": {
    label: "자산 등록",
    icon: Package,
    tone: "text-emerald-300",
  },
  "asset.updated": {
    label: "자산 수정",
    icon: Package,
    tone: "text-on-surface-variant",
  },
  "asset.disposed": {
    label: "자산 폐기",
    icon: Package,
    tone: "text-error-soft",
  },
  "closing.task_toggled": {
    label: "결산 항목 토글",
    icon: CalendarCheck,
    tone: "text-on-surface-variant",
  },
  "settings.rate_updated": {
    label: "요율 변경",
    icon: Sparkles,
    tone: "text-amber-300",
  },
  "settings.closing_task_added": {
    label: "결산항목 추가",
    icon: Sparkles,
    tone: "text-emerald-300",
  },
  "settings.closing_task_removed": {
    label: "결산항목 삭제",
    icon: Sparkles,
    tone: "text-error-soft",
  },
  "year_end.saved": {
    label: "연말정산 입력",
    icon: CalendarCheck,
    tone: "text-tertiary",
  },
  "report.exported": {
    label: "리포트 다운로드",
    icon: Receipt,
    tone: "text-tertiary",
  },
  "ai.ocr": {
    label: "AI 영수증 OCR",
    icon: Sparkles,
    tone: "text-primary-electric",
  },
  "ai.query": {
    label: "AI 자연어 질의",
    icon: Sparkles,
    tone: "text-primary-electric",
  },
};

const PAGE_SIZE = 30;

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

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <Activity aria-hidden className="h-4 w-4" />
            Company Activity Feed
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
        <form className="flex items-center gap-2">
          <select
            name="user"
            defaultValue={userFilter}
            className="h-11 min-w-48 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">전체 사용자</option>
            {users.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex h-11 items-center rounded-lg bg-primary px-4 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
          >
            적용
          </button>
        </form>
      </header>

      {(rows ?? []).length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-body-md text-on-surface-variant">
            활동 기록이 없습니다.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {["오늘", "어제", "이번 주", "이전"].map((bucket) => {
            const items = grouped.get(bucket);
            if (!items || items.length === 0) return null;
            return (
              <section key={bucket}>
                <h2 className="mb-3 text-label-sm font-bold uppercase tracking-widest text-on-surface-variant">
                  {bucket}
                </h2>
                <ul className="space-y-2">
                  {items.map((row) => (
                    <ActivityItem key={row.id} row={row} />
                  ))}
                </ul>
              </section>
            );
          })}

          {/* 페이지네이션 */}
          <div className="flex items-center justify-between text-body-md text-on-surface-variant">
            <span>
              전체 {(count ?? 0).toLocaleString("ko-KR")}건 · {page} /{" "}
              {totalPages} 페이지
            </span>
            <div className="flex gap-2">
              {page > 1 ? (
                <Link
                  href={
                    `/activity?page=${page - 1}${userFilter ? `&user=${userFilter}` : ""}` as never
                  }
                  className="inline-flex h-9 items-center rounded-lg border border-outline-variant px-3 text-on-surface transition-colors hover:bg-primary/10"
                >
                  이전
                </Link>
              ) : null}
              {page < totalPages ? (
                <Link
                  href={
                    `/activity?page=${page + 1}${userFilter ? `&user=${userFilter}` : ""}` as never
                  }
                  className="inline-flex h-9 items-center rounded-lg border border-outline-variant px-3 text-on-surface transition-colors hover:bg-primary/10"
                >
                  다음
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityItem({ row }: { row: AuditRow }) {
  const meta = ACTION_META[row.action] ?? {
    label: row.action,
    icon: Activity,
    tone: "text-on-surface-variant",
  };
  const Icon = meta.icon;
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
    <li className="flex items-start gap-3 rounded-lg border border-outline-variant/15 bg-surface-container-low/50 px-4 py-3">
      <div
        className={cn(
          "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface-container-high",
          meta.tone,
        )}
      >
        <Icon aria-hidden className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className="text-body-md text-on-surface">
          <span className={meta.tone}>{meta.label}</span>{" "}
          <span className="text-on-surface-variant">·{" "}{row.user_email ?? "시스템"}</span>
        </p>
        {metaPreview ? (
          <p className="text-label-sm text-on-surface-variant/70">
            {metaPreview}
          </p>
        ) : null}
      </div>
      <span className="text-label-sm tabular-nums text-on-surface-variant/60">
        {timeStr}
      </span>
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
