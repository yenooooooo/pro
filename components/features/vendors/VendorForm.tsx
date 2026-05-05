"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  Loader2,
  Save,
  Trash2,
  CheckCircle2,
  ShieldQuestion,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { recordAudit } from "@/lib/audit/actions";

const Schema = z.object({
  name: z.string().min(1, "거래처명을 입력하세요").max(100),
  business_no: z
    .string()
    .regex(/^\d{3}-\d{2}-\d{5}$/, "000-00-00000 형식")
    .optional()
    .or(z.literal("")),
  category: z.string().max(50).optional().or(z.literal("")),
  contact_person: z.string().max(50).optional().or(z.literal("")),
  phone: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email("올바른 이메일을 입력하세요").optional().or(z.literal("")),
  contract_start: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  contract_end: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
    .optional()
    .or(z.literal("")),
  memo: z.string().max(1000).optional().or(z.literal("")),
});

export type VendorFormValues = z.infer<typeof Schema>;

type Props = {
  mode: "create" | "edit";
  vendorId?: string;
  initialValues?: Partial<VendorFormValues>;
};

export function VendorForm({ mode, vendorId, initialValues }: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<VendorFormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      name: initialValues?.name ?? "",
      business_no: initialValues?.business_no ?? "",
      category: initialValues?.category ?? "",
      contact_person: initialValues?.contact_person ?? "",
      phone: initialValues?.phone ?? "",
      email: initialValues?.email ?? "",
      contract_start: initialValues?.contract_start ?? "",
      contract_end: initialValues?.contract_end ?? "",
      memo: initialValues?.memo ?? "",
    },
  });

  async function onSubmit(values: VendorFormValues) {
    setServerError(null);
    const supabase = createClient();
    const payload = {
      name: values.name.trim(),
      business_no: values.business_no || null,
      category: values.category ? values.category.trim() : null,
      contact_person: values.contact_person ? values.contact_person.trim() : null,
      phone: values.phone ? values.phone.trim() : null,
      email: values.email ? values.email.trim() : null,
      contract_start: values.contract_start || null,
      contract_end: values.contract_end || null,
      memo: values.memo ? values.memo.trim() : null,
    };

    if (
      payload.contract_start &&
      payload.contract_end &&
      payload.contract_start > payload.contract_end
    ) {
      form.setError("contract_end", { message: "시작일보다 늦어야 합니다." });
      return;
    }

    if (mode === "create") {
      const { data: created, error } = await supabase
        .schema("chongmu")
        .from("vendors")
        .insert(payload)
        .select("id")
        .single();
      if (error) {
        setServerError(error.message);
        return;
      }
      void recordAudit({
        action: "vendor.created",
        entityType: "vendor",
        entityId: created?.id ?? null,
        metadata: { name: payload.name, business_no: payload.business_no },
      });
    } else {
      if (!vendorId) {
        setServerError("vendorId가 누락됐습니다.");
        return;
      }
      const { error } = await supabase
        .schema("chongmu")
        .from("vendors")
        .update(payload)
        .eq("id", vendorId);
      if (error) {
        setServerError(error.message);
        return;
      }
      void recordAudit({
        action: "vendor.updated",
        entityType: "vendor",
        entityId: vendorId,
        metadata: { name: payload.name },
      });
    }

    router.push("/vendors");
    router.refresh();
  }

  async function deleteVendor() {
    if (!vendorId || mode !== "edit") return;
    if (
      !window.confirm(
        "이 거래처를 삭제하시겠습니까?\n연결된 지출 기록이 있으면 거래처가 빈 값(미지정)으로 남습니다.",
      )
    ) {
      return;
    }
    setDeleting(true);
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase
      .schema("chongmu")
      .from("vendors")
      .delete()
      .eq("id", vendorId);
    setDeleting(false);
    if (error) {
      setServerError(`삭제 실패: ${error.message}`);
      return;
    }
    router.push("/vendors");
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting;
  const submitLabel = mode === "create" ? "거래처 등록" : "변경 저장";

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-stack-lg" noValidate>
      <Section title="기본 정보">
        <Field label="거래처명" required error={form.formState.errors.name?.message}>
          <input
            type="text"
            placeholder="주식회사 네오비트"
            {...form.register("name")}
            className={inputClass}
          />
        </Field>
        <Field label="사업자번호" error={form.formState.errors.business_no?.message}>
          <BusinessNoField form={form} inputClass={inputClass} />
        </Field>
        <Field label="카테고리">
          <select {...form.register("category")} className={inputClass}>
            <option value="">선택 안 함</option>
            <option value="partner">협력사</option>
            <option value="supplier">공급사</option>
            <option value="customer">고객사</option>
            <option value="other">기타</option>
          </select>
        </Field>
      </Section>

      <Section title="연락처">
        <Field label="담당자" error={form.formState.errors.contact_person?.message}>
          <input
            type="text"
            placeholder="김지훈"
            {...form.register("contact_person")}
            className={inputClass}
          />
        </Field>
        <Field label="전화" error={form.formState.errors.phone?.message}>
          <input
            type="tel"
            inputMode="tel"
            placeholder="02-555-1234"
            {...form.register("phone")}
            className={inputClass}
          />
        </Field>
        <Field label="이메일" error={form.formState.errors.email?.message}>
          <input
            type="email"
            inputMode="email"
            placeholder="contact@example.com"
            {...form.register("email")}
            className={inputClass}
          />
        </Field>
      </Section>

      <Section title="계약">
        <Field label="계약 시작" error={form.formState.errors.contract_start?.message}>
          <input
            type="date"
            {...form.register("contract_start")}
            className={inputClass}
          />
        </Field>
        <Field
          label="계약 종료"
          error={form.formState.errors.contract_end?.message}
          hint="만료 30일 전부터 알림"
        >
          <input
            type="date"
            {...form.register("contract_end")}
            className={inputClass}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label="메모" error={form.formState.errors.memo?.message}>
            <textarea
              {...form.register("memo")}
              rows={3}
              placeholder="갱신 조건, 협상 내용 등"
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
              onClick={deleteVendor}
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
            href="/vendors"
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

type VerifyResult =
  | { ok: true; valid: boolean; status: string; source: string; note?: string }
  | { ok: false; error: string };

function BusinessNoField({
  form,
  inputClass,
}: {
  form: UseFormReturn<VendorFormValues>;
  inputClass: string;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<VerifyResult | null>(null);

  function verify() {
    const v = form.getValues("business_no");
    if (!v) {
      setResult({ ok: false, error: "사업자번호를 입력하세요." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/vendors/verify?b=${encodeURIComponent(v)}`,
        );
        const json = await res.json();
        setResult(json);
      } catch (err) {
        setResult({
          ok: false,
          error: err instanceof Error ? err.message : "네트워크 오류",
        });
      }
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          placeholder="123-45-67890"
          {...form.register("business_no")}
          className={cn(inputClass, "tabular-nums flex-1")}
        />
        <button
          type="button"
          onClick={verify}
          disabled={pending}
          className="inline-flex min-h-11 items-center gap-1 whitespace-nowrap rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50"
          title="사업자번호 진위 확인"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldQuestion aria-hidden className="h-4 w-4" />
          )}
          진위 확인
        </button>
      </div>
      {result ? (
        result.ok ? (
          <div
            className={
              "inline-flex items-start gap-2 rounded-lg border px-3 py-2 text-label-sm " +
              (result.valid
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-error-soft/40 bg-error-soft/10 text-error-soft")
            }
          >
            {result.valid ? (
              <CheckCircle2 aria-hidden className="mt-0.5 h-4 w-4" />
            ) : (
              <AlertCircle aria-hidden className="mt-0.5 h-4 w-4" />
            )}
            <div>
              <p className="font-semibold">
                {result.valid ? "유효" : "무효"} · {result.status}
              </p>
              <p className="mt-0.5 text-on-surface-variant">
                출처: {result.source === "nts" ? "국세청 odcloud" : "형식 검증"}
                {result.note ? ` · ${result.note}` : ""}
              </p>
            </div>
          </div>
        ) : (
          <p className="inline-flex items-center gap-1 text-label-sm text-error-soft">
            <AlertCircle aria-hidden className="h-4 w-4" />
            {result.error}
          </p>
        )
      ) : null}
    </div>
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
