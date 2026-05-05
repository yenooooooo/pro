"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Calculator, AlertCircle, Check } from "lucide-react";
import { saveYearEndAction } from "../actions";

type Initial = {
  spouse: boolean;
  children_count: number;
  elder_count: number;
  disabled_count: number;
  insurance_premium: number;
  medical_expense: number;
  education_expense: number;
  donation: number;
  housing_loan: number;
  pension_account: number;
  credit_card: number;
  cash_receipt: number;
  notes: string | null;
};

type Props = {
  employeeId: string;
  baseSalary: number;
  currentDependents: number;
  year: number;
  initial?: Initial;
};

const PERSONAL_DEDUCTION = 1_500_000; // 본인 공제 (소득세법)
const SPOUSE_DEDUCTION = 1_500_000;
const CHILD_DEDUCTION = 1_500_000;
const ELDER_DEDUCTION = 1_000_000; // 추가공제 (경로우대)
const DISABLED_DEDUCTION = 2_000_000;

export function YearEndForm({
  employeeId,
  baseSalary,
  year,
  initial,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const [spouse, setSpouse] = useState(initial?.spouse ?? false);
  const [childrenCount, setChildrenCount] = useState(initial?.children_count ?? 0);
  const [elderCount, setElderCount] = useState(initial?.elder_count ?? 0);
  const [disabledCount, setDisabledCount] = useState(initial?.disabled_count ?? 0);
  const [insurance, setInsurance] = useState(initial?.insurance_premium ?? 0);
  const [medical, setMedical] = useState(initial?.medical_expense ?? 0);
  const [education, setEducation] = useState(initial?.education_expense ?? 0);
  const [donation, setDonation] = useState(initial?.donation ?? 0);
  const [housing, setHousing] = useState(initial?.housing_loan ?? 0);
  const [pension, setPension] = useState(initial?.pension_account ?? 0);
  const [creditCard, setCreditCard] = useState(initial?.credit_card ?? 0);
  const [cashReceipt, setCashReceipt] = useState(initial?.cash_receipt ?? 0);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  // 결정세액 추정 (간이 계산)
  const calc = useMemo(() => {
    const totalIncome = baseSalary * 12;
    // 근로소득공제 (간소화: 1,200만 이하 70%, 4,500만 이하 40%, 그 이상 15% — 상한 적용)
    let earnedIncomeDeduction = 0;
    if (totalIncome <= 12_000_000) {
      earnedIncomeDeduction = totalIncome * 0.7;
    } else if (totalIncome <= 45_000_000) {
      earnedIncomeDeduction = 8_400_000 + (totalIncome - 12_000_000) * 0.4;
    } else if (totalIncome <= 100_000_000) {
      earnedIncomeDeduction = 21_600_000 + (totalIncome - 45_000_000) * 0.15;
    } else {
      earnedIncomeDeduction = 29_850_000 + (totalIncome - 100_000_000) * 0.05;
    }
    earnedIncomeDeduction = Math.min(earnedIncomeDeduction, 20_000_000);

    // 인적공제
    const personalDeductions =
      PERSONAL_DEDUCTION +
      (spouse ? SPOUSE_DEDUCTION : 0) +
      childrenCount * CHILD_DEDUCTION +
      elderCount * ELDER_DEDUCTION +
      disabledCount * DISABLED_DEDUCTION;

    // 특별공제 (간이 추정 — 의료비 3% 초과분, 기부금 등 단순화)
    const medicalExcess = Math.max(0, medical - totalIncome * 0.03);
    const specialDeductions =
      Math.min(insurance, 1_000_000) + // 보장성보험 한도 100만
      medicalExcess +
      Math.min(education, 9_000_000) + // 교육비 한도 (자녀 1인 9백만)
      donation +
      Math.min(housing, 4_000_000) +
      Math.min(pension, 7_000_000); // 연금저축 한도

    // 신용카드 공제 (총급여 25% 초과분의 15%)
    const cardThreshold = totalIncome * 0.25;
    const cardExcess = Math.max(0, creditCard + cashReceipt - cardThreshold);
    const cardDeduction = Math.min(cardExcess * 0.15, 3_000_000);

    const taxableIncome = Math.max(
      0,
      totalIncome - earnedIncomeDeduction - personalDeductions - specialDeductions - cardDeduction,
    );

    // 세율 (간이 — 2026년 누진세율 적용)
    let tax = 0;
    const brackets = [
      { limit: 14_000_000, rate: 0.06 },
      { limit: 50_000_000, rate: 0.15, sub: 1_260_000 },
      { limit: 88_000_000, rate: 0.24, sub: 5_760_000 },
      { limit: 150_000_000, rate: 0.35, sub: 15_440_000 },
      { limit: 300_000_000, rate: 0.38, sub: 19_940_000 },
      { limit: 500_000_000, rate: 0.4, sub: 25_940_000 },
      { limit: Infinity, rate: 0.42, sub: 35_940_000 },
    ];
    for (const b of brackets) {
      if (taxableIncome <= b.limit) {
        tax = taxableIncome * b.rate - (b.sub ?? 0);
        break;
      }
    }
    tax = Math.max(0, Math.round(tax));

    // 근로소득세액공제 (간이: 7400만 이하 50%, 70만 한도)
    const earnedTaxCredit = Math.min(tax * 0.5, 740_000);
    const determinedTax = Math.max(0, tax - earnedTaxCredit);

    // 기납부세액 (간이세액표 × 12개월)
    // 단순 추정: 결정세액의 1.05배 정도가 매월 떼간 평균
    const prepaidTax = Math.round(determinedTax * 1.08);

    // 환급 = 기납부 - 결정세액 (양수=환급, 음수=추가납부)
    const refund = prepaidTax - determinedTax;

    return {
      totalIncome,
      earnedIncomeDeduction: Math.round(earnedIncomeDeduction),
      personalDeductions,
      specialDeductions: Math.round(specialDeductions),
      cardDeduction: Math.round(cardDeduction),
      taxableIncome: Math.round(taxableIncome),
      determinedTax,
      prepaidTax,
      refund,
    };
  }, [
    baseSalary,
    spouse,
    childrenCount,
    elderCount,
    disabledCount,
    insurance,
    medical,
    education,
    donation,
    housing,
    pension,
    creditCard,
    cashReceipt,
  ]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setFeedback(null);
    startTransition(async () => {
      const result = await saveYearEndAction({
        employee_id: employeeId,
        year,
        spouse,
        children_count: childrenCount,
        elder_count: elderCount,
        disabled_count: disabledCount,
        insurance_premium: insurance,
        medical_expense: medical,
        education_expense: education,
        donation,
        housing_loan: housing,
        pension_account: pension,
        credit_card: creditCard,
        cash_receipt: cashReceipt,
        notes: notes.trim() || null,
        total_income: calc.totalIncome,
        determined_tax: calc.determinedTax,
        prepaid_tax: calc.prepaidTax,
        refund_amount: calc.refund,
      });
      if (result.ok) {
        setFeedback({ kind: "ok", msg: "저장 완료" });
        router.refresh();
      } else {
        setFeedback({ kind: "err", msg: result.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
      {/* 입력 영역 */}
      <div className="space-y-5 lg:col-span-7">
        <section className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-headline-md font-semibold text-on-surface">
            인적공제
          </h2>
          <Toggle
            label="배우자 공제"
            value={spouse}
            onChange={setSpouse}
          />
          <NumField label="부양 자녀" value={childrenCount} onChange={setChildrenCount} />
          <NumField label="65세 이상 부양가족" value={elderCount} onChange={setElderCount} />
          <NumField label="장애인 부양가족" value={disabledCount} onChange={setDisabledCount} />
        </section>

        <section className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-headline-md font-semibold text-on-surface">
            특별공제 (연간 합계, 원)
          </h2>
          <MoneyField label="보장성 보험료" value={insurance} onChange={setInsurance} hint="한도 100만원" />
          <MoneyField label="의료비" value={medical} onChange={setMedical} hint="총급여 3% 초과분 공제" />
          <MoneyField label="교육비" value={education} onChange={setEducation} hint="자녀 1인 한도 900만원" />
          <MoneyField label="기부금" value={donation} onChange={setDonation} />
          <MoneyField label="주택자금" value={housing} onChange={setHousing} hint="한도 400만원" />
          <MoneyField label="연금저축/IRP" value={pension} onChange={setPension} hint="한도 700만원" />
        </section>

        <section className="glass-panel rounded-xl p-6 space-y-4">
          <h2 className="text-headline-md font-semibold text-on-surface">
            카드/현금영수증
          </h2>
          <MoneyField label="신용카드 사용액" value={creditCard} onChange={setCreditCard} />
          <MoneyField label="현금영수증" value={cashReceipt} onChange={setCashReceipt} />
        </section>

        <section className="glass-panel rounded-xl p-6 space-y-3">
          <h2 className="text-headline-md font-semibold text-on-surface">
            메모
          </h2>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="추가 사항"
            className="w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </section>
      </div>

      {/* 결과 영역 (sticky) */}
      <aside className="lg:col-span-5">
        <div className="glass-panel sticky top-20 rounded-xl p-6 space-y-4">
          <h2 className="flex items-center gap-2 text-headline-md font-semibold text-on-surface">
            <Calculator aria-hidden className="h-5 w-5 text-primary-electric" />
            결정세액 추정
          </h2>

          <div className="space-y-2 border-b border-outline-variant/20 pb-4">
            <RowItem label="총급여 (연)" value={calc.totalIncome} />
            <RowItem label="근로소득공제" value={-calc.earnedIncomeDeduction} />
            <RowItem label="인적공제" value={-calc.personalDeductions} />
            <RowItem label="특별공제" value={-calc.specialDeductions} />
            <RowItem label="신용카드공제" value={-calc.cardDeduction} />
            <RowItem label="과세표준" value={calc.taxableIncome} bold />
          </div>

          <div className="space-y-2">
            <RowItem label="결정세액" value={calc.determinedTax} bold />
            <RowItem label="기납부세액" value={calc.prepaidTax} />
            <div className="border-t border-outline-variant/20 pt-2">
              <RowItem
                label={calc.refund >= 0 ? "환급액" : "추가납부"}
                value={calc.refund}
                large
                positiveColor={calc.refund >= 0 ? "text-emerald-300" : "text-error-soft"}
              />
            </div>
          </div>

          <p className="text-label-sm text-on-surface-variant/60">
            ※ 간이 추정. 실제 결정세액은 국세청 홈택스 연말정산간소화 자료 기반 정밀 계산 권장.
          </p>

          {feedback?.kind === "ok" ? (
            <p className="inline-flex items-center gap-1 text-body-md text-emerald-300">
              <Check aria-hidden className="h-4 w-4" />
              {feedback.msg}
            </p>
          ) : feedback?.kind === "err" ? (
            <p className="inline-flex items-center gap-1 text-body-md text-error-soft">
              <AlertCircle aria-hidden className="h-4 w-4" />
              {feedback.msg}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Save aria-hidden className="h-4 w-4" />
            )}
            저장
          </button>
        </div>
      </aside>
    </form>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3">
      <span className="text-body-md text-on-surface">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={
          "relative inline-flex h-6 w-11 items-center rounded-full transition-colors " +
          (value ? "bg-primary-electric" : "bg-surface-container-high")
        }
      >
        <span
          className={
            "inline-block h-4 w-4 transform rounded-full bg-white transition-transform " +
            (value ? "translate-x-6" : "translate-x-1")
          }
        />
      </button>
    </label>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center justify-between rounded-lg border border-outline-variant/30 bg-surface-container-low px-4 py-3">
      <span className="text-body-md text-on-surface">{label}</span>
      <input
        type="number"
        min={0}
        max={20}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="w-20 rounded border border-outline-variant/40 bg-surface-container px-2 py-1 text-right text-data-tabular tabular-nums text-on-surface"
      />
    </label>
  );
}

function MoneyField({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-label-sm font-semibold text-on-surface-variant">
        {label}
      </label>
      <input
        type="number"
        min={0}
        step={10000}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value)))}
        className="mt-1 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      />
      {hint ? (
        <p className="mt-0.5 text-label-sm text-on-surface-variant/70">{hint}</p>
      ) : null}
    </div>
  );
}

function RowItem({
  label,
  value,
  bold,
  large,
  positiveColor,
}: {
  label: string;
  value: number;
  bold?: boolean;
  large?: boolean;
  positiveColor?: string;
}) {
  return (
    <div className="flex items-baseline justify-between">
      <span className={"text-on-surface-variant " + (bold ? "font-semibold" : "")}>
        {label}
      </span>
      <span
        className={
          "tabular-nums " +
          (large ? "text-headline-md font-bold " : bold ? "text-data-tabular font-semibold " : "text-data-tabular ") +
          (positiveColor ?? "text-on-surface")
        }
      >
        {value.toLocaleString("ko-KR")}원
      </span>
    </div>
  );
}
