"use client";

import { useState, useTransition } from "react";
import { Save, Loader2, Check, AlertCircle } from "lucide-react";
import {
  upsertInsuranceRateAction,
  type InsuranceRateInput,
} from "../actions";

type Rate = {
  id: string;
  year: number;
  pension_rate: number;
  health_rate: number;
  ltc_rate: number;
  employment_rate: number;
  pension_min_base: number | null;
  pension_max_base: number | null;
  effective_from: string | null;
  source: string | null;
};

type Props = {
  rates: Rate[];
  initialYear: number;
  initial: Rate | null;
};

export function InsuranceRatesForm({ rates, initialYear, initial }: Props) {
  const [year, setYear] = useState(initialYear);
  const [form, setForm] = useState<InsuranceRateInput>(toInput(initial, initialYear));
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const yearOptions = Array.from(
    new Set([
      ...rates.map((r) => r.year),
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
    ]),
  ).sort((a, b) => b - a);

  function selectYear(y: number) {
    setYear(y);
    const found = rates.find((r) => r.year === y) ?? null;
    setForm(toInput(found, y));
    setFeedback(null);
  }

  function update<K extends keyof InsuranceRateInput>(key: K, value: InsuranceRateInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await upsertInsuranceRateAction(form);
      if (result.ok) {
        setFeedback({ kind: "ok", msg: `${form.year}년 요율 저장 완료` });
      } else {
        setFeedback({ kind: "err", msg: result.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label-sm uppercase tracking-widest text-on-surface-variant">
          연도
        </span>
        <div className="flex flex-wrap gap-1">
          {yearOptions.map((y) => (
            <button
              key={y}
              type="button"
              onClick={() => selectYear(y)}
              className={
                "rounded-md px-3 py-1.5 text-data-tabular transition-colors " +
                (year === y
                  ? "bg-primary-electric text-on-primary"
                  : "border border-outline-variant/40 bg-surface-container-low text-on-surface hover:bg-surface-container-high")
              }
            >
              {y}년
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <RateField
          label="국민연금 (근로자)"
          value={form.pension_rate}
          onChange={(v) => update("pension_rate", v)}
          hint="예: 0.045 (4.5%)"
        />
        <RateField
          label="건강보험 (근로자)"
          value={form.health_rate}
          onChange={(v) => update("health_rate", v)}
          hint="예: 0.03545 (3.545%)"
        />
        <RateField
          label="장기요양 (건강보험료 대비)"
          value={form.ltc_rate}
          onChange={(v) => update("ltc_rate", v)}
          hint="예: 0.004724 (0.4724%)"
        />
        <RateField
          label="고용보험 (근로자)"
          value={form.employment_rate}
          onChange={(v) => update("employment_rate", v)}
          hint="예: 0.009 (0.9%)"
        />
        <IntField
          label="국민연금 하한 보수월액 (원)"
          value={form.pension_min_base}
          onChange={(v) => update("pension_min_base", v)}
        />
        <IntField
          label="국민연금 상한 보수월액 (원)"
          value={form.pension_max_base}
          onChange={(v) => update("pension_max_base", v)}
        />
        <div className="md:col-span-2">
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            효력 발생일
          </label>
          <input
            type="date"
            value={form.effective_from ?? ""}
            onChange={(e) => update("effective_from", e.target.value || null)}
            className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            근거 출처 (URL 또는 메모)
          </label>
          <input
            type="text"
            value={form.source ?? ""}
            onChange={(e) => update("source", e.target.value || null)}
            placeholder="https://www.nhis.or.kr/..."
            className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div aria-live="polite" className="flex-1">
          {feedback ? (
            <p
              className={
                "inline-flex items-center gap-2 text-body-md " +
                (feedback.kind === "ok" ? "text-emerald-300" : "text-error-soft")
              }
            >
              {feedback.kind === "ok" ? (
                <Check aria-hidden className="h-4 w-4" />
              ) : (
                <AlertCircle aria-hidden className="h-4 w-4" />
              )}
              {feedback.msg}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden className="h-4 w-4" />
          )}
          저장
        </button>
      </div>
    </form>
  );
}

function RateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-label-sm font-semibold text-on-surface-variant">
        {label}
      </label>
      <input
        type="number"
        step="0.000001"
        min={0}
        max={1}
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      />
      {hint ? (
        <p className="mt-1 text-label-sm text-on-surface-variant/70">{hint}</p>
      ) : null}
    </div>
  );
}

function IntField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div>
      <label className="block text-label-sm font-semibold text-on-surface-variant">
        {label}
      </label>
      <input
        type="number"
        step={1}
        min={0}
        inputMode="numeric"
        value={value ?? ""}
        onChange={(e) => {
          const v = e.target.value;
          onChange(v === "" ? null : Number(v));
        }}
        className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      />
    </div>
  );
}

function toInput(rate: Rate | null, year: number): InsuranceRateInput {
  return {
    year: rate?.year ?? year,
    pension_rate: rate ? Number(rate.pension_rate) : 0,
    health_rate: rate ? Number(rate.health_rate) : 0,
    ltc_rate: rate ? Number(rate.ltc_rate) : 0,
    employment_rate: rate ? Number(rate.employment_rate) : 0,
    pension_min_base: rate?.pension_min_base ?? null,
    pension_max_base: rate?.pension_max_base ?? null,
    effective_from: rate?.effective_from ?? null,
    source: rate?.source ?? null,
  };
}
