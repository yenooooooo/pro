import { PageHeader } from "@/components/shared/PageHeader";

export default function ClosingPage() {
  return (
    <>
      <PageHeader
        title="Monthly Closing Center"
        description="Execute end-of-month financial and operational protocols before final sign-off."
      />
      <div className="glass-panel p-10 text-center text-on-surface-variant">
        월말결산 체크리스트 + 리포트 — Phase 6에서 구현
      </div>
    </>
  );
}
