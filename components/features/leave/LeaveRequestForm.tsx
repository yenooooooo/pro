"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays } from "date-fns";
import { z } from "zod";
import { AlertCircle, CalendarPlus, Loader2 } from "lucide-react";
import { createLeaveRequestAction } from "@/lib/leave/actions";
import { cn } from "@/lib/utils/cn";

type EmployeeOption = {
  id: string;
  employee_no: string;
  name: string;
  department: string | null;
  remaining: number | null;
};

const TYPES = [
  { value: "annual", label: "연차", note: "leave_balances 차감" },
  { value: "sick", label: "병가", note: "차감 없음" },
  { value: "family", label: "경조사", note: "차감 없음" },
  { value: "other", label: "기타", note: "차감 없음" },
] as const;

const Schema = z
  .object({
    employee_id: z.string().uuid("직원을 선택하세요"),
    leave_type: z.enum(["annual", "sick", "family", "other"]),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
    days: z.coerce
      .number({ invalid_type_error: "숫자만" })
      .min(0.5, "0.5일 이상")
      .max(365, "365일 이하"),
    reason: z.string().max(200, "200자 이하").optional().or(z.literal("")),
  })
  .refine((d) => d.end_date >= d.start_date, {
    message: "종료일이 시작일보다 빨라요.",
    path: ["end_date"],
  });

type FormValues = z.infer<typeof Schema>;

export function LeaveRequestForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      employee_id: "",
      leave_type: "annual",
      start_date: today,
      end_date: today,
      days: 1,
      reason: "",
    },
  });

  const employeeId = form.watch("employee_id");
  const leaveType = form.watch("leave_type");
  const startDate = form.watch("start_date");
  const endDate = form.watch("end_date");
  const days = Number(form.watch("days"));

  const selectedEmployee = employees.find((e) => e.id === employeeId);
  const calendarDays = computeCalendarDays(startDate, endDate);
  const showShortageWarning =
    leaveType === "annual" &&
    selectedEmployee?.remaining != null &&
    days > selectedEmployee.remaining;

  function applyCalendarDays() {
    if (calendarDays !== null) {
      form.setValue("days", calendarDays, { shouldDirty: true, shouldValidate: true });
    }
  }

  async function onSubmit(values: FormValues) {
    setServerError(null);
    startTransition(async () => {
      const result = await createLeaveRequestAction({
        employee_id: values.employee_id,
        leave_type: values.leave_type,
        start_date: values.start_date,
        end_date: values.end_date,
        days: values.days,
        reason: values.reason ? values.reason.trim() : null,
      });
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      const year = values.start_date.slice(0, 4);
      router.push(`/leave?year=${year}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-stack-lg" noValidate>
      <Section title="신청자" description="직원을 선택하면 잔여 연차가 표시됩니다">
        <Field
          label="직원"
          required
          error={form.formState.errors.employee_id?.message}
        >
          <select
            {...form.register("employee_id")}
            className={inputClass}
            defaultValue=""
          >
            <option value="" disabled>
              직원 선택
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name} ({e.employee_no})
                {e.department ? ` · ${e.department}` : ""}
                {e.remaining != null ? ` · 잔여 ${formatDays(e.remaining)}일` : ""}
              </option>
            ))}
          </select>
        </Field>

        {selectedEmployee ? (
          <div className="md:col-span-1">
            <div className="flex h-full flex-col justify-center rounded-lg border border-outline-variant/30 bg-surface-container-low/60 px-4 py-3">
              <span className="text-label-sm text-on-surface-variant">현재 잔여 연차</span>
              <span className="mt-1 text-headline-md font-semibold tabular-nums text-on-surface">
                {selectedEmployee.remaining != null
                  ? `${formatDays(selectedEmployee.remaining)}일`
                  : "—"}
              </span>
              {selectedEmployee.remaining == null ? (
                <span className="mt-1 text-label-sm text-error-soft">
                  발생 데이터 없음 (Phase 3.7 일괄 부여 필요)
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </Section>

      <Section title="휴가 정보" description="기간과 일수를 입력하세요">
        <Field
          label="유형"
          required
          error={form.formState.errors.leave_type?.message}
          hint={TYPES.find((t) => t.value === leaveType)?.note}
        >
          <select {...form.register("leave_type")} className={inputClass}>
            {TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="일수 (반차 0.5 가능)"
          required
          error={form.formState.errors.days?.message}
        >
          <div className="flex items-stretch gap-2">
            <input
              type="number"
              inputMode="decimal"
              step="0.5"
              min={0.5}
              max={365}
              {...form.register("days")}
              className={cn(inputClass, "tabular-nums")}
            />
            {calendarDays !== null && calendarDays !== days ? (
              <button
                type="button"
                onClick={applyCalendarDays}
                className="whitespace-nowrap rounded border border-primary-container/40 bg-primary-container/20 px-3 text-label-sm font-medium text-primary-electric transition-colors hover:bg-primary-container/30"
              >
                {calendarDays}일 적용
              </button>
            ) : null}
          </div>
        </Field>

        <Field
          label="시작일"
          required
          error={form.formState.errors.start_date?.message}
        >
          <input
            type="date"
            {...form.register("start_date")}
            className={inputClass}
          />
        </Field>

        <Field
          label="종료일"
          required
          error={form.formState.errors.end_date?.message}
        >
          <input
            type="date"
            {...form.register("end_date")}
            className={inputClass}
          />
        </Field>

        <div className="md:col-span-2">
          <Field label="사유" error={form.formState.errors.reason?.message}>
            <textarea
              rows={3}
              placeholder="예: 가족 행사 참석"
              {...form.register("reason")}
              className={cn(inputClass, "min-h-[88px] py-2")}
            />
          </Field>
        </div>
      </Section>

      {showShortageWarning ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error-container/40 bg-error-soft/10 p-3 text-label-sm text-error-soft"
        >
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            잔여 {formatDays(selectedEmployee?.remaining ?? 0)}일이 신청 {formatDays(days)}일보다
            부족합니다. 서버에서도 차단됩니다.
          </span>
        </div>
      ) : null}

      {serverError ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error-container/40 bg-error-soft/10 p-3 text-label-sm text-error-soft"
        >
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/leave"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-high px-6 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-6 text-label-sm font-semibold text-on-primary shadow-[0_0_20px_rgba(192,193,255,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              신청 중…
            </>
          ) : (
            <>
              <CalendarPlus aria-hidden className="h-4 w-4" />
              연차 신청
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function computeCalendarDays(startStr: string, endStr: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startStr) || !/^\d{4}-\d{2}-\d{2}$/.test(endStr)) {
    return null;
  }
  const s = new Date(startStr);
  const e = new Date(endStr);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return null;
  if (e < s) return null;
  return differenceInCalendarDays(e, s) + 1;
}

function formatDays(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

const inputClass =
  "min-h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <header className="mb-4">
        <h3 className="text-headline-md font-semibold text-on-surface">{title}</h3>
        {description ? (
          <p className="mt-1 text-label-sm text-on-surface-variant">{description}</p>
        ) : null}
      </header>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-label-sm font-medium text-on-surface-variant">
        {label}
        {required ? <span className="ml-0.5 text-error-soft">*</span> : null}
      </span>
      {children}
      {error ? (
        <span className="text-label-sm text-error-soft">{error}</span>
      ) : hint ? (
        <span className="text-label-sm text-outline">{hint}</span>
      ) : null}
    </label>
  );
}
