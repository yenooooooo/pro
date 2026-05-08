"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, AlertCircle } from "lucide-react";
import { createTripAction } from "../actions";

type Employee = {
  id: string;
  name: string;
  employee_no: string | null;
};

type Props = {
  employees: Employee[];
};

export function TripForm({ employees }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [title, setTitle] = useState("");
  const [destination, setDestination] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budget, setBudget] = useState<number>(0);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!employeeId || !title || !destination || !startDate || !endDate) {
      setError("필수 항목을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const result = await createTripAction({
        employee_id: employeeId,
        title: title.trim(),
        destination: destination.trim(),
        purpose: purpose.trim() || undefined,
        start_date: startDate,
        end_date: endDate,
        budget,
      });
      if (result.ok) {
        router.push(`/business-trips/${result.id}` as never);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <h2 className="text-headline-md font-semibold text-on-surface">
          출장 정보
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              제목 *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 서울 협력사 미팅 출장"
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              출장자 *
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} {e.employee_no ? `(${e.employee_no})` : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              행선지 *
            </label>
            <input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="예: 서울 강남구 / 일본 도쿄"
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              시작일 *
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              종료일 *
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              예산 (원)
            </label>
            <input
              type="number"
              min={0}
              step={10000}
              value={budget}
              onChange={(e) => setBudget(Number(e.target.value))}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              목적·메모
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="출장 목적, 미팅 상대, 이동 경로 등"
              rows={3}
              className="mt-1 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between">
        <div aria-live="polite">
          {error ? (
            <p className="inline-flex items-center gap-1 text-body-md text-error-soft">
              <AlertCircle aria-hidden className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </div>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-5 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Save aria-hidden className="h-4 w-4" />
          )}
          신청
        </button>
      </div>
    </form>
  );
}
