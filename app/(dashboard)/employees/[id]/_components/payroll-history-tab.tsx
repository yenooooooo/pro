import Link from "next/link";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type PayrollRow = {
  id: string;
  employee_id: string;
  pay_year: number;
  pay_month: number;
  base_salary: number;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
  status: string;
};

type Props = {
  rows: PayrollRow[];
};

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  draft: {
    label: "작성중",
    tone: "border-amber-500/40 bg-amber-500/10 text-amber-300",
  },
  confirmed: {
    label: "확정",
    tone: "border-primary-container/40 bg-primary-container/15 text-primary-electric",
  },
  paid: {
    label: "지급완료",
    tone: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
  },
};

export function PayrollHistoryTab({ rows }: Props) {
  if (rows.length === 0) {
    return (
      <div className="glass-panel rounded-xl p-12 text-center">
        <h3 className="text-headline-md font-semibold text-on-surface">
          급여이력
        </h3>
        <p className="mt-2 text-body-md text-on-surface-variant">
          최근 12개월간 급여 기록이 없습니다.
        </p>
      </div>
    );
  }

  const totalGross = rows.reduce((s, r) => s + (r.gross_pay || 0), 0);
  const totalNet = rows.reduce((s, r) => s + (r.net_pay || 0), 0);
  const totalDed = rows.reduce((s, r) => s + (r.total_deduction || 0), 0);

  return (
    <section className="glass-panel rounded-xl p-6">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-headline-md font-semibold text-on-surface">
          월별 급여 내역
        </h3>
        <p className="text-label-sm text-on-surface-variant">
          최근 12개월 · 총 {rows.length}건
        </p>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-data-tabular">
          <thead>
            <tr className="border-b border-outline-variant/40 text-label-sm uppercase tracking-widest text-on-surface-variant">
              <th className="px-3 py-2 text-left">지급월</th>
              <th className="px-3 py-2 text-right">기본급</th>
              <th className="px-3 py-2 text-right">총지급</th>
              <th className="px-3 py-2 text-right">공제계</th>
              <th className="px-3 py-2 text-right">실지급</th>
              <th className="px-3 py-2 text-center">상태</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const status = STATUS_LABEL[r.status] ?? STATUS_LABEL.draft;
              return (
                <tr
                  key={r.id}
                  className="border-b border-outline-variant/15 last:border-0 transition-colors hover:bg-primary/5"
                >
                  <td className="px-3 py-2 text-on-surface">
                    {r.pay_year}년 {r.pay_month}월
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                    {r.base_salary.toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-on-surface">
                    {r.gross_pay.toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-error-soft">
                    -{r.total_deduction.toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-semibold text-primary-electric">
                    {r.net_pay.toLocaleString("ko-KR")}원
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span
                      className={cn(
                        "inline-flex whitespace-nowrap rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                        status.tone,
                      )}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/payroll/${r.employee_id}?year=${r.pay_year}&month=${r.pay_month}`}
                      className="inline-flex items-center gap-1 text-label-sm text-primary-electric hover:text-primary-container"
                    >
                      <FileText aria-hidden className="h-4 w-4" />
                      명세서
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="bg-surface-container/40 text-label-sm">
              <td className="px-3 py-2 font-semibold text-on-surface">합계</td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant"></td>
              <td className="px-3 py-2 text-right tabular-nums text-on-surface-variant">
                {totalGross.toLocaleString("ko-KR")}원
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-error-soft">
                -{totalDed.toLocaleString("ko-KR")}원
              </td>
              <td className="px-3 py-2 text-right tabular-nums font-semibold text-on-surface">
                {totalNet.toLocaleString("ko-KR")}원
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}
