import { PageHeader } from "@/components/shared/PageHeader";

export default function EmployeesPage() {
  return (
    <>
      <PageHeader
        title="Dynamic Employee Directory"
        description="Visualizing workforce capability and structure. (Phase 2에서 CRUD 구현)"
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        직원 CRUD · TanStack Table · 상세 패널 — Phase 2에서 구현
      </div>
    </>
  );
}
