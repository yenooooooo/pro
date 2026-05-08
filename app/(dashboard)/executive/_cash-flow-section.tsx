import {
  getCashFlowHistory,
  forecastCashFlow,
} from "@/lib/financials/analytics";
import { ExecutiveCharts } from "./_charts";

/**
 * Cash flow + Gemini 예측 섹션 — 별도 async 서버 컴포넌트로 분리해
 * 페이지 본문은 즉시 렌더되고 이 부분만 Suspense 로 stream 됨.
 *
 * Gemini API 호출이 1~3초 걸리는 게 가장 큰 병목이었음.
 */
export async function CashFlowSection() {
  const history = await getCashFlowHistory(12);
  const forecast = await forecastCashFlow(history, 3);
  const all = [...history, ...forecast];
  return <ExecutiveCharts cashFlow={all} />;
}

export function CashFlowSectionSkeleton() {
  return (
    <div className="glass-panel rounded-xl p-6" aria-busy="true">
      <div className="mb-4 h-6 w-48 animate-pulse rounded bg-surface-container-high" />
      <div className="h-72 animate-pulse rounded-lg bg-surface-container/60" />
      <p className="mt-3 text-label-sm text-on-surface-variant/70">
        AI 현금흐름 예측 분석 중…
      </p>
    </div>
  );
}
