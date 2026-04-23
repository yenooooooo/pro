import { PageHeader } from "@/components/shared/PageHeader";

export default function AttendancePage() {
  return (
    <>
      <PageHeader
        title="Attendance"
        description="월별 근태 입력·집계. (Phase 3에서 캘린더 + 일괄 입력 구현)"
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        근태 입력 — Phase 3에서 구현
      </div>
    </>
  );
}
