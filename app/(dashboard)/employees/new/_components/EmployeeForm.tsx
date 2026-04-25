"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type Option = { id: string; name: string };
type PositionOption = Option & { level: number };

type Props = {
  departments: Option[];
  positions: PositionOption[];
};

const Schema = z.object({
  employee_no: z
    .string()
    .min(1, "사번을 입력하세요")
    .max(20, "20자 이하로 입력하세요"),
  name: z.string().min(1, "이름을 입력하세요").max(50, "50자 이하"),
  department_id: z.string().uuid("부서를 선택하세요"),
  position_id: z.string().uuid("직급을 선택하세요"),
  hire_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식으로 입력하세요"),
  birth_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식")
    .optional()
    .or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z
    .string()
    .email("올바른 이메일을 입력하세요")
    .optional()
    .or(z.literal("")),
  bank_name: z.string().max(20).optional().or(z.literal("")),
  bank_account: z.string().max(40).optional().or(z.literal("")),
  base_salary: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .int("정수만 입력")
    .min(0, "0 이상")
    .max(100_000_000, "1억 이하"),
  dependents: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .int("정수만 입력")
    .min(1, "최소 1명")
    .max(11, "최대 11명"),
});

type Input = z.infer<typeof Schema>;

export function EmployeeForm({ departments, positions }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<Input>({
    resolver: zodResolver(Schema),
    defaultValues: {
      employee_no: "",
      name: "",
      department_id: "",
      position_id: "",
      hire_date: "",
      birth_date: "",
      phone: "",
      email: "",
      bank_name: "",
      bank_account: "",
      base_salary: 3_000_000,
      dependents: 1,
    },
  });

  async function onSubmit(values: Input) {
    setServerError(null);
    const supabase = createClient();
    const payload = {
      employee_no: values.employee_no.trim(),
      name: values.name.trim(),
      department_id: values.department_id,
      position_id: values.position_id,
      hire_date: values.hire_date,
      birth_date: values.birth_date ? values.birth_date : null,
      phone: values.phone ? values.phone.trim() : null,
      email: values.email ? values.email.trim() : null,
      bank_name: values.bank_name ? values.bank_name.trim() : null,
      bank_account: values.bank_account ? values.bank_account.trim() : null,
      base_salary: values.base_salary,
      dependents: values.dependents,
      status: "active" as const,
    };

    const { data, error } = await supabase
      .schema("chongmu")
      .from("employees")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      if (error.code === "23505") {
        setServerError("이미 사용 중인 사번입니다.");
        form.setError("employee_no", { message: "이미 사용 중인 사번" });
      } else {
        setServerError(error.message);
      }
      return;
    }

    router.push(`/employees?selected=${data.id}`);
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <form
      onSubmit={form.handleSubmit(onSubmit)}
      className="space-y-stack-lg"
      noValidate
    >
      <Section title="기본정보" description="식별 가능한 핵심 정보">
        <Field
          label="사번"
          required
          error={form.formState.errors.employee_no?.message}
        >
          <input
            type="text"
            placeholder="DEV-3007"
            {...form.register("employee_no")}
            className={inputClass}
          />
        </Field>

        <Field label="이름" required error={form.formState.errors.name?.message}>
          <input
            type="text"
            placeholder="홍길동"
            {...form.register("name")}
            className={inputClass}
          />
        </Field>

        <Field
          label="부서"
          required
          error={form.formState.errors.department_id?.message}
        >
          <select {...form.register("department_id")} className={inputClass}>
            <option value="">부서 선택</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="직급"
          required
          error={form.formState.errors.position_id?.message}
        >
          <select {...form.register("position_id")} className={inputClass}>
            <option value="">직급 선택</option>
            {positions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="입사일"
          required
          error={form.formState.errors.hire_date?.message}
        >
          <input type="date" {...form.register("hire_date")} className={inputClass} />
        </Field>

        <Field
          label="생년월일"
          error={form.formState.errors.birth_date?.message}
          hint="주민등록번호는 저장하지 않습니다"
        >
          <input
            type="date"
            {...form.register("birth_date")}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="연락처" description="이메일·전화는 선택">
        <Field label="이메일" error={form.formState.errors.email?.message}>
          <input
            type="email"
            inputMode="email"
            placeholder="name@chongmu.pro"
            {...form.register("email")}
            className={inputClass}
          />
        </Field>

        <Field label="전화번호" error={form.formState.errors.phone?.message}>
          <input
            type="tel"
            inputMode="tel"
            placeholder="010-0000-0000"
            {...form.register("phone")}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section
        title="재무정보"
        description="계좌번호는 화면에서 자동 마스킹됩니다"
      >
        <Field label="은행" error={form.formState.errors.bank_name?.message}>
          <input
            type="text"
            placeholder="신한"
            {...form.register("bank_name")}
            className={inputClass}
          />
        </Field>

        <Field
          label="계좌번호"
          error={form.formState.errors.bank_account?.message}
        >
          <input
            type="text"
            placeholder="110-123-456789"
            {...form.register("bank_account")}
            className={inputClass}
          />
        </Field>

        <Field
          label="기본급 (월, 원)"
          required
          error={form.formState.errors.base_salary?.message}
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            {...form.register("base_salary")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>

        <Field
          label="공제대상가족수"
          required
          error={form.formState.errors.dependents?.message}
          hint="간이세액표 조회 기준"
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={11}
            {...form.register("dependents")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
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
          href="/employees"
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
              직원 등록
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
