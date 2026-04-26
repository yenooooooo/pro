"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Calculator, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { calcDailyHours } from "@/lib/attendance/calc-hours";
import { cn } from "@/lib/utils/cn";

type EmployeeOption = {
  id: string;
  employee_no: string;
  name: string;
  department: string | null;
};

const Schema = z.object({
  employee_id: z.string().uuid("직원을 선택하세요"),
  work_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식"),
  check_in: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "HH:MM 형식"),
  check_out: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "HH:MM 형식"),
  night_hours: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .min(0, "0 이상")
    .max(24, "24 이하"),
  holiday_hours: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .min(0, "0 이상")
    .max(24, "24 이하"),
  note: z.string().max(200, "200자 이하").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof Schema>;

export function AttendanceForm({ employees }: { employees: EmployeeOption[] }) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  const form = useForm<FormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      employee_id: "",
      work_date: today,
      check_in: "09:00",
      check_out: "18:00",
      night_hours: 0,
      holiday_hours: 0,
      note: "",
    },
  });

  const checkIn = form.watch("check_in");
  const checkOut = form.watch("check_out");
  const calc = calcDailyHours({ checkIn, checkOut });

  async function onSubmit(values: FormValues) {
    setServerError(null);

    const result = calcDailyHours({
      checkIn: values.check_in,
      checkOut: values.check_out,
    });
    if (!result.success) {
      setServerError(result.error);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase
      .schema("chongmu")
      .from("attendance")
      .insert({
        employee_id: values.employee_id,
        work_date: values.work_date,
        check_in: `${values.check_in}:00`,
        check_out: `${values.check_out}:00`,
        regular_hours: result.regularHours,
        overtime_hours: result.overtimeHours,
        night_hours: values.night_hours,
        holiday_hours: values.holiday_hours,
        note: values.note ? values.note.trim() : null,
      });

    if (error) {
      if (error.code === "23505") {
        setServerError(
          "해당 직원의 같은 날짜 근태가 이미 있습니다. 기존 항목을 수정하세요.",
        );
        return;
      }
      setServerError(error.message);
      return;
    }

    const month = values.work_date.slice(0, 7);
    router.push(`/attendance?month=${month}`);
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-stack-lg"
      noValidate
    >
      <Section title="기본정보" description="직원과 일자를 선택하세요">
        <Field
          label="일자"
          required
          error={form.formState.errors.work_date?.message}
        >
          <input
            type="date"
            {...form.register("work_date")}
            className={inputClass}
          />
        </Field>

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
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section
        title="근로 시간"
        description="출/퇴근 시각으로 정상근로·연장근로가 자동 계산됩니다"
      >
        <Field
          label="출근"
          required
          error={form.formState.errors.check_in?.message}
        >
          <input
            type="time"
            {...form.register("check_in")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>

        <Field
          label="퇴근"
          required
          error={form.formState.errors.check_out?.message}
        >
          <input
            type="time"
            {...form.register("check_out")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>

        <div className="md:col-span-2">
          <CalcPreview
            regular={calc.success ? calc.regularHours : null}
            overtime={calc.success ? calc.overtimeHours : null}
            elapsed={calc.success ? calc.elapsedHours : null}
            breakHours={calc.success ? calc.breakHours : null}
            error={calc.success ? null : calc.error}
          />
        </div>

        <Field
          label="야간 근로 (h)"
          error={form.formState.errors.night_hours?.message}
          hint="22시~06시 가산분. 자정 넘기는 근무 시 직접 입력"
        >
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={24}
            {...form.register("night_hours")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>

        <Field
          label="휴일 근로 (h)"
          error={form.formState.errors.holiday_hours?.message}
          hint="주휴일·공휴일 근무 시간"
        >
          <input
            type="number"
            inputMode="decimal"
            step="0.5"
            min={0}
            max={24}
            {...form.register("holiday_hours")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
      </Section>

      <Section title="비고" description="필요 시 사유나 메모를 남기세요">
        <div className="md:col-span-2">
          <Field label="메모" error={form.formState.errors.note?.message}>
            <textarea
              rows={3}
              placeholder="예: 거래처 미팅으로 외근"
              {...form.register("note")}
              className={cn(inputClass, "min-h-[88px] py-2")}
            />
          </Field>
        </div>
      </Section>

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
          href="/attendance"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-high px-6 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
        >
          취소
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-6 text-label-sm font-semibold text-on-primary shadow-[0_0_20px_rgba(192,193,255,0.25)] transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? (
            <>
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              저장 중…
            </>
          ) : (
            <>
              <Save aria-hidden className="h-4 w-4" />
              근태 등록
            </>
          )}
        </button>
      </div>
    </form>
  );
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

function CalcPreview({
  regular,
  overtime,
  elapsed,
  breakHours,
  error,
}: {
  regular: number | null;
  overtime: number | null;
  elapsed: number | null;
  breakHours: number | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-error-container/30 bg-error-soft/5 p-3 text-label-sm text-error-soft">
        <AlertCircle aria-hidden className="h-4 w-4 flex-shrink-0" />
        {error}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-outline-variant/30 bg-surface-container-low/60 p-3 text-data-tabular tabular-nums">
      <div className="flex items-center gap-2 text-on-surface-variant">
        <Calculator aria-hidden className="h-4 w-4 text-primary-electric" />
        <span className="text-label-sm">자동 계산</span>
      </div>
      <Stat label="정상근로" value={`${regular}h`} tone="default" />
      <Stat
        label="연장"
        value={overtime != null && overtime > 0 ? `+${overtime}h` : "0h"}
        tone={overtime != null && overtime > 0 ? "tertiary" : "muted"}
      />
      <Stat label="총 경과" value={`${elapsed}h`} tone="muted" />
      <Stat label="휴게" value={`-${breakHours}h`} tone="muted" />
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "tertiary" | "muted";
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-label-sm text-outline">{label}</span>
      <span
        className={cn(
          "font-semibold",
          tone === "tertiary"
            ? "text-tertiary-sky"
            : tone === "muted"
              ? "text-on-surface-variant"
              : "text-on-surface",
        )}
      >
        {value}
      </span>
    </span>
  );
}
