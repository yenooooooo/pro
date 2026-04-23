import { PageHeader } from "@/components/shared/PageHeader";

type Params = { params: { employeeId: string } };

export default function PayslipPage({ params }: Params) {
  return (
    <>
      <PageHeader
        title="급여명세서"
        description={`Employee ID: ${params.employeeId} (Phase 4.3에서 인쇄·PDF 지원)`}
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        개인별 급여명세서 — Phase 4.3에서 구현
      </div>
    </>
  );
}
