import Link from "next/link";
import { FileSignature, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import {
  APPROVAL_KIND_LABEL,
  APPROVAL_STATUS_LABEL,
  label,
} from "@/lib/labels";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, string> = {
  draft: "border-outline-variant/40 bg-surface-container-high text-on-surface-variant",
  pending: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  approved: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  rejected: "border-error-soft/40 bg-error-soft/10 text-error-soft",
  cancelled: "border-outline-variant/40 bg-surface-container-high text-on-surface-variant",
};

type Row = {
  id: string;
  kind: string;
  title: string;
  amount: number | null;
  status: string;
  current_step: number;
  requester_email: string | null;
  created_at: string;
};

export default async function ApprovalsPage() {
  const t = await getTranslations("approvals");
  const supabase = createClient();
  const { data: rows } = await supabase
    .schema("chongmu")
    .from("approval_requests")
    .select("id, kind, title, amount, status, current_step, requester_email, created_at")
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<Row[]>();

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <FileSignature aria-hidden className="h-4 w-4" />
            Electronic Approval
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            {t("title")}
          </h1>
          <p className="text-body-md text-on-surface-variant">
            {t("subtitle")}
          </p>
        </div>
        <Link
          href={"/approvals/new" as never}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus aria-hidden className="h-4 w-4" />
          {t("create")}
        </Link>
      </header>

      {(rows ?? []).length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-headline-md font-semibold text-on-surface">
            결재 이력이 없습니다
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            오른쪽 상단 &apos;새 결재 발의&apos; 버튼으로 시작하세요.
          </p>
        </div>
      ) : (
        <section className="glass-panel overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-data-tabular">
              <thead>
                <tr className="border-b border-outline-variant/30 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3 text-left">유형</th>
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-left">발의자</th>
                  <th className="px-4 py-3 text-center">단계</th>
                  <th className="px-4 py-3 text-center">상태</th>
                  <th className="px-4 py-3 text-left">발의일</th>
                </tr>
              </thead>
              <tbody>
                {(rows ?? []).map((r) => {
                  const tone = STATUS_TONE[r.status] ?? STATUS_TONE.draft;
                  return (
                    <tr
                      key={r.id}
                      className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                    >
                      <td className="px-4 py-3">
                        <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                          {label(APPROVAL_KIND_LABEL, r.kind)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/approvals/${r.id}` as never}
                          className="font-medium text-on-surface hover:text-primary-electric"
                        >
                          {r.title}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                        {r.amount ? `${r.amount.toLocaleString("ko-KR")}원` : "—"}
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-label-sm">
                        {r.requester_email ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center text-on-surface-variant tabular-nums">
                        {r.status === "approved" || r.status === "rejected"
                          ? "—"
                          : r.current_step}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${tone}`}
                        >
                          {label(APPROVAL_STATUS_LABEL, r.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-on-surface-variant text-label-sm tabular-nums">
                        {r.created_at.slice(0, 10)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
