import { PageHeader } from "@/components/shared/PageHeader";

export default function ExpensesPage() {
  return (
    <>
      <PageHeader
        title="지출 입력"
        description="거래처·카테고리별 지출 관리. (Phase 5.1에서 구현)"
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        지출 CRUD + 영수증 업로드 — Phase 5.1
      </div>
    </>
  );
}
