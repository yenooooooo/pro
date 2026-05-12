import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { AuditLogsTable } from "./_components/audit-logs-table";

type SearchParams = {
  action?: string;
  page?: string;
};

const PAGE_SIZE = 50;

const ACTION_OPTIONS = [
  { value: "", label: "전체" },
  { value: "payroll.confirmed", label: "급여 확정" },
  { value: "payroll.calculated", label: "급여 계산" },
  { value: "employee.created", label: "직원 등록" },
  { value: "employee.updated", label: "직원 수정" },
  { value: "employee.bank_changed", label: "계좌 변경" },
  { value: "employee.resigned", label: "직원 퇴사" },
];

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const t = await getTranslations("audit_logs");
  const supabase = createClient();
  const action = searchParams.action ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .schema("chongmu")
    .from("audit_logs")
    .select(
      "id, occurred_at, user_id, user_email, action, entity_type, entity_id, metadata, ip_address",
      { count: "exact" },
    )
    .order("occurred_at", { ascending: false })
    .range(from, to);

  if (action) {
    query = query.eq("action", action);
  }

  const { data: rows, count, error } = await query;

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M20</b>System · Audit Trail
          </div>
          <h1 className="page-h">
            감사 <em>로그.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
      </header>

      {/* ===== Filter form ===== */}
      <form className="mb-6 flex flex-wrap items-end gap-3 border border-line bg-bg-1 p-4">
        <label className="flex flex-col gap-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            액션 필터
          </span>
          <select
            name="action"
            defaultValue={action}
            className="h-9 min-w-48 border border-line bg-bg px-3 font-mono text-[12px] text-text-1 focus:border-gold-soft focus:outline-none"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn-primary">
          적용
        </button>
        {(action || page > 1) && (
          <a href="/audit-logs" className="btn">
            초기화
          </a>
        )}
      </form>

      {error && (
        <div className="mb-6 border border-line bg-bg-1 p-4 font-mono text-[12px] text-[#E06B5F]">
          로그 조회 실패: {error.message}
        </div>
      )}

      <Suspense
        fallback={
          <div className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            불러오는 중…
          </div>
        }
      >
        <AuditLogsTable
          rows={rows ?? []}
          totalCount={count ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          actionFilter={action}
        />
      </Suspense>
    </div>
  );
}
