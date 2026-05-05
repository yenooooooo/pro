"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  Paperclip,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";
import { ReceiptOcrZone } from "./ReceiptOcrZone";
import type { OcrParsedReceipt } from "@/lib/ai/types";

type Option = { id: string; name: string };

const RECEIPTS_BUCKET = "receipts";
const RECEIPT_MAX_BYTES = 5 * 1024 * 1024; // 5MB
const RECEIPT_MIME = ["image/png", "image/jpeg", "image/webp", "application/pdf"];

const Schema = z.object({
  expense_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD 형식으로 입력하세요"),
  amount: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .int("정수만 입력")
    .min(0, "0 이상")
    .max(1_000_000_000, "10억 이하"),
  vat: z.coerce
    .number({ invalid_type_error: "숫자만 입력" })
    .int("정수만 입력")
    .min(0, "0 이상")
    .default(0),
  payment_method: z.enum(["card", "cash", "transfer", "other"], {
    errorMap: () => ({ message: "결제수단을 선택하세요" }),
  }),
  category_id: z.string().uuid("카테고리를 선택하세요").optional().or(z.literal("")),
  vendor_id: z.string().uuid("거래처를 선택하세요").optional().or(z.literal("")),
  description: z.string().max(500).optional().or(z.literal("")),
  is_taxable: z.boolean().default(true),
});

export type ExpenseFormValues = z.infer<typeof Schema>;

type Props = {
  mode: "create" | "edit";
  expenseId?: string;
  initialValues?: Partial<ExpenseFormValues>;
  initialReceiptUrl?: string | null;
  categories: Option[];
  vendors: Option[];
};

export function ExpenseForm({
  mode,
  expenseId,
  initialValues,
  initialReceiptUrl,
  categories,
  vendors,
}: Props) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(
    initialReceiptUrl ?? null,
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<ExpenseFormValues>({
    resolver: zodResolver(Schema),
    defaultValues: {
      expense_date: initialValues?.expense_date ?? today(),
      amount: initialValues?.amount ?? 0,
      vat: initialValues?.vat ?? 0,
      payment_method: initialValues?.payment_method ?? "card",
      category_id: initialValues?.category_id ?? "",
      vendor_id: initialValues?.vendor_id ?? "",
      description: initialValues?.description ?? "",
      is_taxable: initialValues?.is_taxable ?? true,
    },
  });

  function pickFile() {
    fileInputRef.current?.click();
  }

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > RECEIPT_MAX_BYTES) {
      setServerError("영수증 파일은 5MB 이하로 업로드하세요.");
      return;
    }
    if (!RECEIPT_MIME.includes(file.type)) {
      setServerError("PNG/JPG/WEBP/PDF만 업로드 가능합니다.");
      return;
    }
    setServerError(null);
    setReceiptFile(file);
  }

  async function clearReceipt() {
    setReceiptFile(null);
    setReceiptUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function onSubmit(values: ExpenseFormValues) {
    setServerError(null);
    const supabase = createClient();

    let nextReceiptUrl = receiptUrl;
    if (receiptFile) {
      setUploading(true);
      try {
        const ext = receiptFile.name.split(".").pop() ?? "bin";
        const path = `${values.expense_date}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from(RECEIPTS_BUCKET)
          .upload(path, receiptFile, {
            cacheControl: "3600",
            upsert: false,
            contentType: receiptFile.type,
          });
        if (upErr) {
          setServerError(`영수증 업로드 실패: ${upErr.message}`);
          setUploading(false);
          return;
        }
        const { data: pub } = supabase.storage.from(RECEIPTS_BUCKET).getPublicUrl(path);
        nextReceiptUrl = pub.publicUrl;
      } finally {
        setUploading(false);
      }
    }

    const payload = {
      expense_date: values.expense_date,
      amount: values.amount,
      vat: values.vat,
      payment_method: values.payment_method,
      category_id: values.category_id || null,
      vendor_id: values.vendor_id || null,
      description: values.description ? values.description.trim() : null,
      receipt_url: nextReceiptUrl,
      is_taxable: values.is_taxable,
    };

    if (mode === "create") {
      const { error } = await supabase
        .schema("chongmu")
        .from("expenses")
        .insert(payload);
      if (error) {
        setServerError(error.message);
        return;
      }
    } else {
      if (!expenseId) {
        setServerError("expenseId가 누락됐습니다.");
        return;
      }
      const { error } = await supabase
        .schema("chongmu")
        .from("expenses")
        .update(payload)
        .eq("id", expenseId);
      if (error) {
        setServerError(error.message);
        return;
      }
    }

    router.push("/expenses");
    router.refresh();
  }

  const isSubmitting = form.formState.isSubmitting || uploading;
  const submitLabel = mode === "create" ? "지출 등록" : "변경 저장";

  function applyOcrResult(data: OcrParsedReceipt) {
    if (data.date) form.setValue("expense_date", data.date);
    if (typeof data.amount === "number") form.setValue("amount", data.amount);
    if (typeof data.vat === "number") form.setValue("vat", data.vat);
    if (data.payment_method) form.setValue("payment_method", data.payment_method);
    if (data.description) form.setValue("description", data.description);

    // 거래처: 가맹점명이 vendor list 에 있으면 매칭
    if (data.vendor_name) {
      const matched = vendors.find(
        (v) => v.name.replace(/\s/g, "") === data.vendor_name?.replace(/\s/g, ""),
      );
      if (matched) form.setValue("vendor_id", matched.id);
    }
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-stack-lg" noValidate>
      {mode === "create" ? <ReceiptOcrZone onResult={applyOcrResult} /> : null}
      <Section title="기본 정보">
        <Field label="지출 일자" required error={form.formState.errors.expense_date?.message}>
          <input
            type="date"
            {...form.register("expense_date")}
            className={inputClass}
          />
        </Field>
        <Field label="결제 수단" required error={form.formState.errors.payment_method?.message}>
          <select {...form.register("payment_method")} className={inputClass}>
            <option value="card">카드</option>
            <option value="cash">현금</option>
            <option value="transfer">계좌이체</option>
            <option value="other">기타</option>
          </select>
        </Field>
        <Field label="카테고리" error={form.formState.errors.category_id?.message}>
          <select {...form.register("category_id")} className={inputClass}>
            <option value="">선택 안 함</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="거래처" error={form.formState.errors.vendor_id?.message}>
          <select {...form.register("vendor_id")} className={inputClass}>
            <option value="">선택 안 함</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="금액">
        <Field label="금액 (원)" required error={form.formState.errors.amount?.message}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={1000}
            {...form.register("amount")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
        <Field label="부가세 (원)" error={form.formState.errors.vat?.message}>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            step={100}
            {...form.register("vat")}
            className={cn(inputClass, "tabular-nums")}
          />
        </Field>
        <Field label="과세 여부" hint="면세 항목이면 해제">
          <label className="inline-flex min-h-11 items-center gap-2 text-body-md text-on-surface">
            <input
              type="checkbox"
              {...form.register("is_taxable")}
              className="h-4 w-4 rounded border-outline-variant bg-surface-container-lowest text-primary-electric focus:ring-primary-electric"
            />
            과세 거래
          </label>
        </Field>
      </Section>

      <Section title="영수증 / 메모">
        <div className="md:col-span-2">
          <Field label="영수증" hint="PNG/JPG/WEBP/PDF · 최대 5MB">
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept={RECEIPT_MIME.join(",")}
                onChange={onFileSelected}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={pickFile}
                  className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/40 bg-surface-container-high px-4 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
                >
                  <Upload aria-hidden className="h-4 w-4" />
                  파일 선택
                </button>
                {receiptFile ? (
                  <span className="inline-flex items-center gap-1.5 truncate rounded-lg border border-primary-electric/40 bg-primary-electric/10 px-3 py-1.5 text-label-sm text-primary-electric">
                    <Paperclip aria-hidden className="h-3.5 w-3.5" />
                    {receiptFile.name}
                  </span>
                ) : receiptUrl ? (
                  <a
                    href={receiptUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 truncate rounded-lg border border-tertiary-sky/40 bg-tertiary-sky/10 px-3 py-1.5 text-label-sm text-tertiary-sky transition-colors hover:bg-tertiary-sky/20"
                  >
                    <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                    기존 영수증 보기
                  </a>
                ) : (
                  <span className="text-label-sm text-on-surface-variant">
                    파일이 선택되지 않음
                  </span>
                )}
                {(receiptFile || receiptUrl) && (
                  <button
                    type="button"
                    onClick={clearReceipt}
                    className="inline-flex min-h-11 items-center gap-1 px-2 text-label-sm text-error-soft transition-colors hover:text-error"
                  >
                    <Trash2 aria-hidden className="h-3.5 w-3.5" />
                    제거
                  </button>
                )}
              </div>
            </div>
          </Field>
        </div>
        <div className="md:col-span-2">
          <Field label="설명 / 메모" error={form.formState.errors.description?.message}>
            <textarea
              {...form.register("description")}
              rows={3}
              placeholder="영수증·내역 보충 설명"
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

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link
          href="/expenses"
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
              {uploading ? "업로드 중…" : "저장 중…"}
            </>
          ) : (
            <>
              <Save aria-hidden className="h-4 w-4" />
              {submitLabel}
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
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
