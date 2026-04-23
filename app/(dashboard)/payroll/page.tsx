import { PageHeader } from "@/components/shared/PageHeader";

export default function PayrollPage() {
  return (
    <>
      <PageHeader
        title="Payroll Execution Matrix"
        description="Manage, calculate, and disburse scheduled payments with absolute precision."
        actions={
          <>
            <button className="min-h-11 rounded-lg border border-outline-variant px-4 text-data-tabular text-on-surface-variant hover:text-on-surface">
              Export Ledger
            </button>
            <button className="min-h-11 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 text-data-tabular font-semibold text-on-primary shadow-indigo-glow">
              Authorize Batch
            </button>
          </>
        }
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        급여 일괄 계산 테이블 — Phase 4에서 구현
      </div>
    </>
  );
}
