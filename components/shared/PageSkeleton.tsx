/**
 * 공통 페이지 스켈레톤
 * — 클릭 즉시 노출되어 체감 속도 개선 (loading.tsx 용)
 *
 * variant:
 *  - "list"      : KPI 3종 + 카드 그리드
 *  - "table"     : KPI 3종 + 큰 테이블
 *  - "dashboard" : KPI 4종 + 좌(메인) + 우(사이드) 12-col 그리드
 *  - "form"      : 헤더 + 큰 폼 영역
 */
type Variant = "list" | "table" | "dashboard" | "form";

export function PageSkeleton({ variant = "list" }: { variant?: Variant }) {
  return (
    <div className="space-y-stack-lg" aria-busy="true" aria-live="polite">
      <span className="sr-only">불러오는 중…</span>

      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-48 animate-pulse rounded bg-surface-container-high" />
          <div className="h-4 w-72 animate-pulse rounded bg-surface-container" />
        </div>
        <div className="hidden gap-3 sm:flex">
          <div className="h-11 w-32 animate-pulse rounded-lg bg-surface-container" />
          <div className="h-11 w-32 animate-pulse rounded-lg bg-surface-container-high" />
        </div>
      </div>

      {/* KPI row */}
      <div
        className={
          variant === "dashboard"
            ? "grid grid-cols-2 gap-gutter md:grid-cols-4"
            : "grid grid-cols-1 gap-gutter md:grid-cols-3"
        }
      >
        {Array.from({ length: variant === "dashboard" ? 4 : 3 }).map((_, i) => (
          <div
            key={i}
            className="glass-panel h-32 animate-pulse rounded-lg p-stack-md"
          />
        ))}
      </div>

      {/* Body */}
      {variant === "table" ? (
        <div className="glass-panel rounded-xl p-stack-md">
          <div className="mb-4 h-10 w-full animate-pulse rounded-lg bg-surface-container-low" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-12 w-full animate-pulse rounded bg-surface-container/60"
              />
            ))}
          </div>
        </div>
      ) : variant === "form" ? (
        <div className="glass-panel space-y-4 rounded-xl p-stack-lg">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 w-24 animate-pulse rounded bg-surface-container" />
              <div className="h-11 w-full animate-pulse rounded-lg bg-surface-container-low" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-gutter">
          <div className="glass-panel col-span-12 rounded-xl p-stack-md lg:col-span-8">
            <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-40 animate-pulse rounded-xl bg-surface-container/60"
                />
              ))}
            </div>
          </div>
          <div className="col-span-12 flex flex-col gap-gutter lg:col-span-4">
            <div className="glass-panel h-64 animate-pulse rounded-xl" />
            <div className="glass-panel h-64 animate-pulse rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
