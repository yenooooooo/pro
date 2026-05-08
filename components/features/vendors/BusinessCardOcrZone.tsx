"use client";

import { useRef, useState } from "react";
import {
  Sparkles,
  Upload,
  Loader2,
  Check,
  AlertTriangle,
  Wand2,
} from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import { cn } from "@/lib/utils/cn";

type ParsedCard = {
  company: string | null;
  name: string | null;
  role: string | null;
  phone: string | null;
  email: string | null;
  business_no: string | null;
  address: string | null;
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  form: UseFormReturn<any>;
};

export function BusinessCardOcrZone({ form }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; data: ParsedCard }
    | { kind: "err"; msg: string }
    | null
  >(null);

  async function handleFile(file: File) {
    setBusy(true);
    setFeedback(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/ocr/business-card", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const data = json.data as ParsedCard;
        if (data.company) form.setValue("name", data.company);
        if (data.name) form.setValue("contact_person", data.name);
        if (data.phone) form.setValue("phone", data.phone);
        if (data.email) form.setValue("email", data.email);
        if (data.business_no) form.setValue("business_no", data.business_no);
        setFeedback({ kind: "ok", data });
      } else if (json.source === "no-key") {
        setFeedback({
          kind: "err",
          msg: "GEMINI_API_KEY 미설정 — 명함 OCR 비활성화",
        });
      } else {
        setFeedback({ kind: "err", msg: json.error ?? "OCR 실패" });
      }
    } catch (err) {
      setFeedback({
        kind: "err",
        msg: err instanceof Error ? err.message : "네트워크 오류",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-dashed border-primary-electric/40 bg-primary-electric/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles aria-hidden className="h-4 w-4 text-primary-electric" />
        <h4 className="text-body-md font-semibold text-on-surface">
          명함 사진 자동 인식
        </h4>
        <span className="rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
          AI
        </span>
      </div>
      <p className="mb-3 text-label-sm text-on-surface-variant">
        명함 사진을 업로드하면 회사명·담당자·전화·이메일이 자동으로 폼에 채워집니다.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className={cn(
          "inline-flex min-h-11 items-center gap-2 rounded-lg border border-primary-electric/40 bg-surface-container-low px-4 py-2 text-body-md text-on-surface transition-colors hover:bg-surface-container-high disabled:opacity-50",
        )}
      >
        {busy ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Upload aria-hidden className="h-4 w-4" />
        )}
        {busy ? "분석 중…" : "명함 사진 선택"}
      </button>

      {feedback?.kind === "ok" ? (
        <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-3 text-label-sm">
          <div className="mb-1 inline-flex items-center gap-1 font-semibold text-emerald-300">
            <Check aria-hidden className="h-4 w-4" />
            인식 완료
          </div>
          <ul className="space-y-0.5 text-on-surface-variant">
            {feedback.data.company ? <li>회사: {feedback.data.company}</li> : null}
            {feedback.data.name ? <li>담당자: {feedback.data.name} {feedback.data.role ? `(${feedback.data.role})` : ""}</li> : null}
            {feedback.data.phone ? <li>전화: {feedback.data.phone}</li> : null}
            {feedback.data.email ? <li>이메일: {feedback.data.email}</li> : null}
            {feedback.data.business_no ? <li>사업자번호: {feedback.data.business_no}</li> : null}
          </ul>
          <p className="mt-2 inline-flex items-center gap-1 text-on-surface-variant/70">
            <Wand2 aria-hidden className="h-3 w-3" />
            결과가 폼에 자동 입력되었습니다.
          </p>
        </div>
      ) : null}

      {feedback?.kind === "err" ? (
        <div className="mt-3 inline-flex items-center gap-1 rounded border border-error-soft/30 bg-error-soft/5 px-3 py-2 text-label-sm text-error-soft">
          <AlertTriangle aria-hidden className="h-4 w-4" />
          {feedback.msg}
        </div>
      ) : null}
    </div>
  );
}
