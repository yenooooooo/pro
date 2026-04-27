"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertCircle, Loader2, Save, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

type EmployeeOption = { id: string; name: string };

const Schema = z.object({
  asset_no: z.string().max(40).optional().or(z.literal("")),
  name: z.string().min(1, "자산명을 입력하세요").max(100),
  category: z.string().max(40).optional().or(z.literal("")),
  acquisition_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  acquisition_cost: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .int("정수만 입력")
    .min(0, "0 이상")
    .max(10_000_000_000, "100억 이하")
    .optional(),
  useful_life: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .int("정수만 입력")
    .min(1, "1년 이상")
    .max(50, "50년 이하")
    .optional(),
  assigned_to: z.string().uuid("담당 직원을 선택").optional().or(z.literal("")),
  location: z.string().max(100).optional().or(z.literal("")),
  status: z.enum(["in_use", "repair", "disposed", "sold"], {
    errorMap: () => ({ message: "상태를 선택" }),
  }),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

export type AssetFormValues = z.infer<typeof Schema>;

const STATUS_OPTIONS: Array<{ value: AssetFormValues["status"]; label: string }> = [
  { value: "in_use", label: "사용중" },
  { value: "repair", label: "수리중" },
  { value: "disposed", label: "폐기" },
  { value: "sold", label: "매각" },
];

type Props = {
  mode: "create" | "edit";
  assetId?: string;
  initialValues?: Partial<AssetFormValues>;
  employees: EmployeeOption[];
};

export function AssetForm({ mode, assetId, initialValues, employees }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      asset_no: initialValues?.asset_no ?? "",
      name: initialValues?.name ?? "",
      category: initialValues?.category ?? "",
      acquisition_date: initialValues?.acquisition_date ?? "",
      acquisition_cost: initialValues?.acquisition_cost,
      useful_life: initialValues?.useful_life,
      assigned_to: initialValues?.assigned_to ?? "",
      location: initialValues?.location ?? "",
      status: initialValues?.status ?? "in_use",
      memo: initialValues?.memo ?? "",
    },
  });

  async function onSubmit(values: AssetFormValues) {
    setServerError(null);
    const supabase = createClient();
    const payload = {
      asset_no: values.asset_no || null,
      name: values.name.trim(),
      category: values.category ? values.category.trim() : null,
      acquisition_date: values.acquisition_date || null,
      acquisition_cost: values.acquisition_cost ?? null,
      useful_life: values.useful_life ?? null,
      assigned_to: values.assigned_to || null,
      location: values.location ? values.location.trim() : null,
      status: STATUS_DB_VALUE[values.status],
      memo: values.memo ? values.memo.trim() : null,
    };

    if (mode === "create") {
      const { error } = await supabase
        .schema("chongmu")
        .from("assets")
        .insert(payload);
      if (error) {
        setServerError(error.message);
        return;
      }
    } else {
      if (!assetId) {
        setServerError("assetId가 누락됐습니다.");
        return;
      }
      const { error } = await supabase
        .schema("chongmu")
        .from("assets")
        .update(payload)
        .eq("id", assetId);
      if (error) {
        setServerError(error.message);
        return;
      }
    }
    router.push("/assets");
    router.refresh();
  }

  async function deleteAsset() {
    if (!assetId || mode !== "edit") return;
    if (!window.confirm("이 자산을 삭제하시겠습니까?")) return;
    setDeleting(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase
      .schema("chongmu")
      .from("assets")
      .delete()
      .eq("id", assetId);
    setDeleting(false);
    if (error) {
      setServerError(`삭제 실패: ${error.message}`);
      return;
    }
    router.push("/assets");
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;
  const submitLabel = mode === "create" ? "자산 등록" : "변경 저장";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-stack-lg" noValidate>
      <Section title="기본 정보">
        <Field label="자산번호" hint="예: IT-2026-001" error={form.formState.errors.asset_no?.message}>
          <input type="text" {...form.register("asset_no")} className={inputClass} />
        </Field>
        <Field label="자산명" required error={form.formState.errors.name?.message}>
          <input
            type="text"
            placeholder="MacBook Pro 16"
            {...form.register("name")}
            className={inputClass}
          />
        </Field>
        <Field label="분류" hint="IT기기 / 사무가구 / 차량 / 기타">
          <input
            type="text"
            placeholder="IT기기"
            {...form.register("category")}
            className={inputClass}
          />
        </Field>
        <Field label="위치" error={form.formState.errors.location?.message}>
          <input
            type="text"
            placeholder="서울 본사 5F"
            {...form.register("location")}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="취득 / 감가상각">
        <Field label="취득일" error={form.formState.errors.acquisition_date?.message}>
          <input
            type="date"
            {...form.register("acquisition_date")}
            className={inputClass}
          />
        </Field>
        <Field
          label="취득가 (원)"
          error={form.formState.errors.acquisition_cost?.message}
        >
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            {...form.register("acquisition_cost")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
        <Field
          label="내용연수 (년)"
          hint="PC 5년 / 사무가구 5년 / 차량 5년"
          error={form.formState.errors.useful_life?.message}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            {...form.register("useful_life")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
        <Field label="상태" required error={form.formState.errors.status?.message}>
          <select {...form.register("status")} className={inputClass}>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="배정 / 메모">
        <Field label="배정 직원" error={form.formState.errors.assigned_to?.message}>
          <select {...form.register("assigned_to")} className={inputClass}>
            <option value="">공용</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="md:col-span-2">
          <Field label="메모">
            <textarea
              {...form.register("memo")}
              rows={3}
              placeholder="시리얼·구매처·특이사항"
              className={cn(inputClass, "min-h-[80px] resize-y")}
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {mode === "edit" ? (
            <button
              type="button"
              onClick={deleteAsset}
              disabled={deleting || isSubmitting}
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-error-soft/30 bg-error-soft/5 px-4 text-label-sm text-error-soft transition-colors hover:bg-error-soft/15 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 aria-hidden className="h-4 w-4" />
              {deleting ? "삭제 중…" : "삭제"}
            </button>
          ) : null}
        </div>
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href="/assets"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-outline-variant/50 bg-surface-container-high px-6 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || deleting}
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
                {submitLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
}

const STATUS_DB_VALUE: Record<AssetFormValues["status"], string> = {
  in_use: "사용중",
  repair: "수리중",
  disposed: "폐기",
  sold: "매각",
};

const inputClass =
  "min-h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest px-3 py-2 text-body-md text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="glass-panel rounded-xl p-6">
      <h3 className="mb-4 text-headline-md font-semibold text-on-surface">{title}</h3>
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

export const STATUS_DB_TO_FORM: Record<string, AssetFormValues["status"]> = {
  사용중: "in_use",
  수리중: "repair",
  폐기: "disposed",
  매각: "sold",
};
