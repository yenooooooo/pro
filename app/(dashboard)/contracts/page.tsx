import Link from "next/link";
import { FileSignature, Plus, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { differenceInDays } from "date-fns";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  service: "용역",
  supply: "공급",
  lease: "임대차",
  employment: "근로",
  nda: "비밀유지",
  other: "기타",
};

const STATUS_TONE: Record<string, string> = {
  active: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  expired: "border-error-soft/40 bg-error-soft/10 text-error-soft",
  terminated:
    "border-outline-variant/40 bg-surface-container-high text-on-surface-variant",
  draft: "border-amber-500/40 bg-amber-500/10 text-amber-300",
};

const STATUS_LABEL: Record<string, string> = {
  active: "유효",
  expired: "만료",
  terminated: "해지",
  draft: "작성중",
};

type Contract = {
  id: string;
  title: string;
  contract_type: string | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendors: { id: string; name: string } | null;
};

export default async function ContractsPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("contracts" as any)
    .select(
      "id, title, contract_type, amount, start_date, end_date, status, vendors:vendor_id(id, name)",
    )
    .order("end_date", { ascending: true, nullsFirst: false })
    .returns<Contract[]>();

  const today = new Date();
  const contracts = (rows ?? []).map((c) => ({
    ...c,
    daysToExpiry: c.end_date ? differenceInDays(new Date(c.end_date), today) : null,
  }));

  const expiringSoon = contracts.filter(
    (c) =>
      c.daysToExpiry !== null && c.daysToExpiry >= 0 && c.daysToExpiry <= 30,
  );
  const expired = contracts.filter(
    (c) => c.daysToExpiry !== null && c.daysToExpiry < 0,
  );

  return (
    <div className="space-y-stack-lg">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
            <FileSignature aria-hidden className="h-4 w-4" />
            Contract Management
          </p>
          <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            계약서 관리
          </h1>
          <p className="text-body-md text-on-surface-variant">
            계약서 PDF/이미지를 업로드하면 AI 가 만료일·당사자·금액을 자동 추출.
            만료 30일 전 자동 알림.
          </p>
        </div>
        <Link
          href={"/contracts/new" as never}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus aria-hidden className="h-4 w-4" />
          새 계약서 등록
        </Link>
      </header>

      {/* 알림 박스 */}
      {expiringSoon.length > 0 || expired.length > 0 ? (
        <div className="space-y-2">
          {expired.length > 0 && (
            <div className="glass-panel flex items-start gap-3 rounded-xl border border-error-soft/40 bg-error-soft/5 p-4">
              <AlertTriangle
                aria-hidden
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-error-soft"
              />
              <div>
                <p className="font-semibold text-error-soft">
                  만료된 계약 {expired.length}건
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  status=&apos;expired&apos; 로 자동 갱신 또는 해지 처리하세요.
                </p>
              </div>
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="glass-panel flex items-start gap-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
              <AlertTriangle
                aria-hidden
                className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-300"
              />
              <div>
                <p className="font-semibold text-amber-300">
                  만료 임박 계약 {expiringSoon.length}건 (30일 이내)
                </p>
                <p className="text-label-sm text-on-surface-variant">
                  갱신 검토가 필요합니다.
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {/* 목록 */}
      {contracts.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <p className="text-headline-md font-semibold text-on-surface">
            등록된 계약서가 없습니다
          </p>
          <p className="mt-2 text-body-md text-on-surface-variant">
            계약서 PDF/이미지를 업로드하면 AI 가 자동으로 항목을 추출합니다.
          </p>
        </div>
      ) : (
        <div className="glass-panel overflow-hidden rounded-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-data-tabular">
              <thead>
                <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
                  <th className="px-4 py-3 text-left">유형</th>
                  <th className="px-4 py-3 text-left">제목</th>
                  <th className="px-4 py-3 text-left">거래처</th>
                  <th className="px-4 py-3 text-right">금액</th>
                  <th className="px-4 py-3 text-left">기간</th>
                  <th className="px-4 py-3 text-center">D-day</th>
                  <th className="px-4 py-3 text-center">상태</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                  >
                    <td className="px-4 py-3">
                      <span className="rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                        {TYPE_LABEL[c.contract_type ?? ""] ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-on-surface">
                      {c.title}
                    </td>
                    <td className="px-4 py-3 text-on-surface-variant">
                      {c.vendors?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-on-surface">
                      {c.amount ? `${c.amount.toLocaleString("ko-KR")}원` : "—"}
                    </td>
                    <td className="px-4 py-3 text-label-sm text-on-surface-variant tabular-nums">
                      {c.start_date} ~ {c.end_date ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {c.daysToExpiry !== null ? (
                        <span
                          className={
                            "tabular-nums " +
                            (c.daysToExpiry < 0
                              ? "text-error-soft"
                              : c.daysToExpiry < 30
                                ? "text-amber-300"
                                : "text-on-surface-variant")
                          }
                        >
                          {c.daysToExpiry >= 0
                            ? `D-${c.daysToExpiry}`
                            : `D+${Math.abs(c.daysToExpiry)}`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold ${STATUS_TONE[c.status] ?? STATUS_TONE.draft}`}
                      >
                        {STATUS_LABEL[c.status] ?? c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
