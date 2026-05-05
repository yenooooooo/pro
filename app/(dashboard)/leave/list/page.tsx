import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { LeaveActions } from "./_components/leave-actions";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "", label: "전체" },
  { value: "pending", label: "대기" },
  { value: "approved", label: "승인" },
  { value: "rejected", label: "반려" },
];

const TYPE_OPTIONS = [
  { value: "", label: "전체" },
  { value: "annual", label: "연차" },
  { value: "sick", label: "병가" },
  { value: "family", label: "경조사" },
  { value: "other", label: "기타" },
];

const TYPE_LABEL: Record<string, string> = {
  annual: "연차",
  sick: "병가",
  family: "경조사",
  other: "기타",
};

const STATUS_TONE: Record<string, string> = {
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-error-soft/40 bg-error-soft/10 text-error-soft",
};

type RequestRow = {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
  employee: {
    name: string;
    employee_no: string | null;
    department: { name: string } | null;
  } | null;
};

export default async function LeaveListPage({
  searchParams,
}: {
  searchParams: { status?: string; type?: string; page?: string };
}) {
  const supabase = createClient();
  const status = STATUS_OPTIONS.find((s) => s.value === searchParams.status)
    ?.value ?? "";
  const type = TYPE_OPTIONS.find((t) => t.value === searchParams.type)?.value ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("leave_requests")
    .select(
      `id, employee_id, leave_type, start_date, end_date, days, reason, status, created_at,
       employee:employees!inner(name, employee_no, department:departments(name))`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) query = query.eq("status", status);
  if (type) query = query.eq("leave_type", type);

  const { data: rows, count } = await query.returns<RequestRow[]>();

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/leave"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        연차 메인으로
      </Link>

      <header>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          전체 휴가 신청 이력
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          신청·승인·반려 모든 기록. 대기 항목은 결재 처리할 수 있습니다.
        </p>
      </header>

      <form
        method="get"
        className="glass-panel flex flex-wrap items-end gap-4 rounded-xl p-4"
      >
        <div className="flex items-center gap-2 text-on-surface-variant">
          <Filter aria-hidden className="h-4 w-4" />
          <span className="text-label-sm uppercase tracking-widest">필터</span>
        </div>
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-on-surface-variant">상태</span>
          <select
            name="status"
            defaultValue={status}
            className="h-11 min-w-32 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-label-sm text-on-surface-variant">유형</span>
          <select
            name="type"
            defaultValue={type}
            className="h-11 min-w-32 rounded-lg border border-outline-variant bg-surface-container-lowest px-3 text-body-md text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          적용
        </button>
        {(status || type || page > 1) && (
          <Link
            href={"/leave/list" as never}
            className="inline-flex h-11 items-center rounded-lg border border-outline-variant px-5 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
          >
            초기화
          </Link>
        )}
      </form>

      {(rows ?? []).length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center text-body-md text-on-surface-variant">
          조건에 맞는 신청이 없습니다.
        </div>
      ) : (
        <>
          <div className="glass-panel overflow-hidden rounded-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-data-tabular">
                <thead>
                  <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
                    <th className="px-4 py-3 text-left">신청자</th>
                    <th className="px-4 py-3 text-left">유형</th>
                    <th className="px-4 py-3 text-left">기간</th>
                    <th className="px-4 py-3 text-right">일수</th>
                    <th className="px-4 py-3 text-left">사유</th>
                    <th className="px-4 py-3 text-center">상태</th>
                    <th className="px-4 py-3 text-left">신청일</th>
                    <th className="px-4 py-3 text-right">결재</th>
                  </tr>
                </thead>
                <tbody>
                  {(rows ?? []).map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/employees/${r.employee_id}` as never}
                          className="font-semibold text-on-surface hover:text-primary-electric"
                        >
                          {r.employee?.name ?? "—"}
                        </Link>
                        <div className="text-label-sm text-on-surface-variant">
                          {r.employee?.department?.name ?? "—"} ·{" "}
                          {r.employee?.employee_no ?? "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-on-surface">
                        {TYPE_LABEL[r.leave_type] ?? r.leave_type}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant tabular-nums">
                        {r.start_date} ~ {r.end_date}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                        {Number(r.days).toFixed(1)}일
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant">
                        <span className="line-clamp-2 max-w-xs">
                          {r.reason ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[r.status] ?? ""}`}
                        >
                          {r.status === "pending"
                            ? "대기"
                            : r.status === "approved"
                              ? "승인"
                              : "반려"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-label-sm text-on-surface-variant tabular-nums">
                        {r.created_at.slice(0, 10)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {r.status === "pending" ? (
                          <LeaveActions requestId={r.id} />
                        ) : (
                          <span className="text-label-sm text-on-surface-variant/40">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between text-body-md text-on-surface-variant">
            <span>
              전체 {(count ?? 0).toLocaleString("ko-KR")}건 · {page} / {totalPages} 페이지
            </span>
            <div className="flex gap-2">
              <PageLink
                page={page - 1}
                searchParams={{ status, type }}
                disabled={page <= 1}
                label="이전"
                icon={<ChevronLeft className="h-4 w-4" />}
              />
              <PageLink
                page={page + 1}
                searchParams={{ status, type }}
                disabled={page >= totalPages}
                label="다음"
                icon={<ChevronRight className="h-4 w-4" />}
                iconRight
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageLink({
  page,
  searchParams,
  disabled,
  label,
  icon,
  iconRight,
}: {
  page: number;
  searchParams: { status: string; type: string };
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
  if (searchParams.status) params.set("status", searchParams.status);
  if (searchParams.type) params.set("type", searchParams.type);
  if (page > 1) params.set("page", String(page));
  const href = `/leave/list${params.toString() ? `?${params.toString()}` : ""}`;
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
