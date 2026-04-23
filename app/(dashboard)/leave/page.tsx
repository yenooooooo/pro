import { PageHeader } from "@/components/shared/PageHeader";

export default function LeavePage() {
  return (
    <>
      <PageHeader
        title="연차 관리"
        description="연차 발생·사용 기록. (Phase 3.2에서 구현)"
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        연차 잔여·신청 — Phase 3.2에서 구현
      </div>
    </>
  );
}
