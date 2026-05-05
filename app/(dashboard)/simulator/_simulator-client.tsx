"use client";

import { useMemo, useState } from "react";
import { Users, Sparkles, ArrowRight, RotateCcw } from "lucide-react";

/**
 * 회사 부담 4대보험 요율 합 (근로자부담과 별도, 회사가 부담하는 부분).
 * 정확히는 매년 변동하지만 시뮬용 안전 추정치 (보수월액의 약 9.4%).
 *  - 국민연금 4.5% (회사부담)
 *  - 건강보험 약 3.545% (회사부담)
 *  - 장기요양 약 0.45% (회사부담)
 *  - 고용보험 약 0.9% (회사부담)
 *  - 산재보험 업종별 0.5~5% (평균 0.8% 가정 — 시뮬 기본값)
 */
const EMPLOYER_BURDEN_RATE = 0.094;

type DeptAggregate = {
  department: string;
  headcount: number;
  total_base: number;
  avg_base: number;
};

type Baseline = {
  headcount: number;
  totalBase: number;
  overallAvg: number;
};

type Props = {
  departments: DeptAggregate[];
  baseline: Baseline;
};

export function SimulatorClient({ departments, baseline }: Props) {
  // 시뮬 입력
  const [newHires, setNewHires] = useState(0); // 신규 채용 인원
  const [newHireSalary, setNewHireSalary] = useState(3_500_000); // 신규 평균 기본급
  const [raisePercent, setRaisePercent] = useState(0); // 전사 일괄 인상률
  const [minWageHike, setMinWageHike] = useState(0); // 최저임금 인상률 (%) — 미달 직원 자동 인상

  const result = useMemo(() => {
    const baseTotal = baseline.totalBase;

    // 1) 일괄 인상
    const afterRaise = baseTotal * (1 + raisePercent / 100);

    // 2) 최저임금 인상 — 현 최저임금 기준 미달 직원만 인상.
    //    여기서는 단순 추정: 평균 미만 직원의 X% 인상으로 환산
    //    실제 구현에서는 직원별 base_salary 와 신규 최저임금 비교가 정확하지만
    //    시뮬용으로 "기본급 평균 미만의 50% 직원이 minWageHike% 인상" 가정
    const halfHeadcount = Math.floor(baseline.headcount / 2);
    const avgUnderHalf = baseline.overallAvg * 0.85; // 평균 미만 직원 평균 추정
    const minWageImpact =
      halfHeadcount * avgUnderHalf * (minWageHike / 100);

    // 3) 신규 채용
    const newHireMonthly = newHires * newHireSalary;

    // 합산 — 월 기본급 총액
    const newMonthlyBase = afterRaise + minWageImpact + newHireMonthly;

    // 회사 부담 4대보험 합산
    const employerBurden = newMonthlyBase * EMPLOYER_BURDEN_RATE;
    const totalMonthlyCost = newMonthlyBase + employerBurden;
    const totalAnnualCost = totalMonthlyCost * 12;

    const baselineMonthly = baseTotal * (1 + EMPLOYER_BURDEN_RATE);
    const monthlyDelta = totalMonthlyCost - baselineMonthly;
    const annualDelta = monthlyDelta * 12;

    return {
      newHeadcount: baseline.headcount + newHires,
      monthlyBase: newMonthlyBase,
      employerBurden,
      totalMonthlyCost,
      totalAnnualCost,
      monthlyDelta,
      annualDelta,
      pctChange:
        baselineMonthly > 0
          ? (monthlyDelta / baselineMonthly) * 100
          : 0,
    };
  }, [baseline, newHires, newHireSalary, raisePercent, minWageHike]);

  function reset() {
    setNewHires(0);
    setNewHireSalary(3_500_000);
    setRaisePercent(0);
    setMinWageHike(0);
  }

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
      {/* 좌측: 현재 상태 + 부서별 */}
      <section className="glass-panel rounded-xl p-6 lg:col-span-5">
        <h2 className="mb-4 flex items-center gap-2 text-headline-md font-semibold text-on-surface">
          <Users aria-hidden className="h-5 w-5 text-tertiary" />
          현재 상태
        </h2>
        <div className="space-y-3">
          <Stat label="활성 직원 수" value={`${baseline.headcount} 명`} />
          <Stat
            label="월 기본급 총액"
            value={`${baseline.totalBase.toLocaleString("ko-KR")} 원`}
          />
          <Stat
            label="평균 기본급"
            value={`${baseline.overallAvg.toLocaleString("ko-KR")} 원`}
          />
          <Stat
            label="회사 4대보험 부담 (월)"
            value={`${Math.round(baseline.totalBase * EMPLOYER_BURDEN_RATE).toLocaleString("ko-KR")} 원`}
            hint={`기본급 × ${(EMPLOYER_BURDEN_RATE * 100).toFixed(1)}%`}
          />
        </div>

        <div className="mt-5 border-t border-outline-variant/20 pt-5">
          <p className="mb-2 text-label-sm uppercase tracking-widest text-on-surface-variant">
            부서별
          </p>
          <ul className="space-y-2">
            {departments.map((d) => (
              <li
                key={d.department}
                className="flex items-center justify-between rounded border border-outline-variant/20 bg-surface-container-low px-3 py-2 text-data-tabular"
              >
                <div>
                  <span className="font-medium text-on-surface">
                    {d.department}
                  </span>
                  <span className="ml-2 text-label-sm text-on-surface-variant">
                    {d.headcount}명
                  </span>
                </div>
                <span className="tabular-nums text-on-surface-variant">
                  {d.total_base.toLocaleString("ko-KR")}원
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 중앙: 입력 슬라이더 */}
      <section className="glass-panel rounded-xl p-6 lg:col-span-4">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface">
            <Sparkles aria-hidden className="h-5 w-5 text-primary-electric" />
            시뮬 입력
          </h2>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
            title="초기화"
          >
            <RotateCcw aria-hidden className="h-3.5 w-3.5" />
            초기화
          </button>
        </div>

        <div className="space-y-5">
          <Slider
            label="신규 채용 인원"
            value={newHires}
            onChange={setNewHires}
            min={0}
            max={20}
            step={1}
            display={`${newHires}명`}
          />
          <NumberInput
            label="신규 채용 평균 기본급"
            value={newHireSalary}
            onChange={setNewHireSalary}
            min={0}
            step={100_000}
            display={`${newHireSalary.toLocaleString("ko-KR")}원`}
          />
          <Slider
            label="전사 일괄 인상률"
            value={raisePercent}
            onChange={setRaisePercent}
            min={-10}
            max={20}
            step={0.5}
            display={`${raisePercent > 0 ? "+" : ""}${raisePercent}%`}
          />
          <Slider
            label="최저임금 인상 영향 시뮬"
            value={minWageHike}
            onChange={setMinWageHike}
            min={0}
            max={20}
            step={0.5}
            display={`+${minWageHike}%`}
            hint="평균 미만 직원의 절반에 적용 (보수적 추정)"
          />
        </div>
      </section>

      {/* 우측: 결과 */}
      <section className="glass-panel rounded-xl p-6 lg:col-span-3">
        <h2 className="mb-4 flex items-center gap-2 text-headline-md font-semibold text-on-surface">
          <ArrowRight aria-hidden className="h-5 w-5 text-primary-electric" />
          결과
        </h2>
        <div className="space-y-4">
          <ResultBig
            label="월간 총 인건비 (예상)"
            value={result.totalMonthlyCost}
            delta={result.monthlyDelta}
          />
          <ResultBig
            label="연간 총 인건비 (예상)"
            value={result.totalAnnualCost}
            delta={result.annualDelta}
          />
          <div className="rounded border border-outline-variant/20 bg-surface-container-low p-3">
            <p className="text-label-sm text-on-surface-variant">
              총 인원 변화
            </p>
            <p className="mt-0.5 text-data-tabular tabular-nums text-on-surface">
              {baseline.headcount} → {result.newHeadcount} 명
            </p>
          </div>
          <div className="rounded border border-outline-variant/20 bg-surface-container-low p-3">
            <p className="text-label-sm text-on-surface-variant">
              증감률
            </p>
            <p
              className={`mt-0.5 text-headline-md font-bold tabular-nums ${
                result.pctChange > 0
                  ? "text-error-soft"
                  : result.pctChange < 0
                    ? "text-emerald-300"
                    : "text-on-surface"
              }`}
            >
              {result.pctChange > 0 ? "+" : ""}
              {result.pctChange.toFixed(1)}%
            </p>
          </div>
        </div>
      </section>

      <div className="lg:col-span-12">
        <div className="glass-panel rounded-xl p-4">
          <p className="text-label-sm text-on-surface-variant">
            ⓘ 시뮬 기준: 기본급 + 회사 부담 4대보험 합산 (보수월액 × {(EMPLOYER_BURDEN_RATE * 100).toFixed(1)}%
            추정). 식대·수당·성과급 등 변동급은 제외. 산재요율은 업종별로 다르므로 실제와 차이가
            날 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-outline-variant/15 pb-2 last:border-0 last:pb-0">
      <span className="text-label-sm text-on-surface-variant">
        {label}
        {hint ? (
          <span className="ml-1 text-on-surface-variant/60">({hint})</span>
        ) : null}
      </span>
      <span className="text-data-tabular font-semibold tabular-nums text-on-surface">
        {value}
      </span>
    </div>
  );
}

function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step,
  display,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  display: string;
  hint?: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-label-sm font-semibold text-on-surface-variant">
          {label}
        </label>
        <span className="text-data-tabular font-semibold tabular-nums text-primary-electric">
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary-electric"
      />
      {hint ? (
        <p className="mt-0.5 text-label-sm text-on-surface-variant/70">{hint}</p>
      ) : null}
    </div>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  min,
  step,
  display,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  step: number;
  display: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-label-sm font-semibold text-on-surface-variant">
          {label}
        </label>
        <span className="text-data-tabular font-semibold tabular-nums text-primary-electric">
          {display}
        </span>
      </div>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      />
    </div>
  );
}

function ResultBig({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: number;
}) {
  return (
    <div>
      <p className="text-label-sm text-on-surface-variant">{label}</p>
      <p className="mt-0.5 text-headline-md font-bold tabular-nums text-on-surface">
        {Math.round(value).toLocaleString("ko-KR")}원
      </p>
      <p
        className={`mt-0.5 text-label-sm tabular-nums ${
          delta > 0
            ? "text-error-soft"
            : delta < 0
              ? "text-emerald-300"
              : "text-on-surface-variant"
        }`}
      >
        {delta > 0 ? "+" : ""}
        {Math.round(delta).toLocaleString("ko-KR")}원 (vs 현재)
      </p>
    </div>
  );
}
