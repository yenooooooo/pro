import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
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
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <ShieldCheck aria-hidden className="h-4 w-4" />
          Audit Trail
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          {t("title")}
        </h1>
        <p className="text-body-md text-on-surface-variant">
          {t("subtitle")}
        </p>
      </header>

      <form className="glass-panel flex flex-wrap items-end gap-4 p-4">
        <label className="flex flex-col gap-1">
          <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
            액션 필터
          </span>
          <select
            name="action"
            defaultValue={action}
            className="h-11 min-w-48 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {ACTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          적용
        </button>
        {(action || page > 1) && (
          <a
            href="/audit-logs"
            className="inline-flex h-11 items-center justify-center rounded-lg border border-outline-variant px-5 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            초기화
          </a>
        )}
      </form>

      {error && (
        <div className="glass-panel p-4 text-body-md text-destructive">
          로그 조회 실패: {error.message}
        </div>
      )}

      <Suspense fallback={<div className="text-on-surface-variant">불러오는 중…</div>}>
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
