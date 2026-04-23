import { PageHeader } from "@/components/shared/PageHeader";

export default function AssetsPage() {
  return (
    <>
      <PageHeader
        title="자산 관리"
        description="고정자산·감가상각·직원 배정 현황. (Phase 5.3)"
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        자산 CRUD + 감가상각 — Phase 5.3
      </div>
    </>
  );
}
