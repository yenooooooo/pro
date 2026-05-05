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
import { cn } from "@/lib/utils/cn";
import type { OcrParsedReceipt, OcrSource } from "@/lib/ai/types";

type Props = {
  onResult: (data: OcrParsedReceipt, source: OcrSource) => void;
};

export function ReceiptOcrZone({ onResult }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<
    | { kind: "ok"; source: OcrSource; data: OcrParsedReceipt }
    | { kind: "err"; msg: string }
    | null
  >(null);

  async function handleFile(file: File) {
    setBusy(true);
    setProgress(0);
    setFeedback(null);

    // 1) Gemini 시도
    let data: OcrParsedReceipt | null = null;
    let source: OcrSource = "no-key";
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/ocr/receipt", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.ok && json.data) {
        data = json.data as OcrParsedReceipt;
        source = "gemini";
      } else if (json.source === "no-key") {
        // Tesseract 로 fallback
        source = "no-key";
      } else {
        // 그 외 에러는 Tesseract 시도
        source = "no-key";
      }
    } catch {
      source = "no-key";
    }

    // 2) Gemini 실패 시 Tesseract.js 로 fallback
    if (!data) {
      try {
        const { recognizeReceiptInBrowser } = await import(
          "@/lib/ai/tesseract-fallback"
        );
        data = await recognizeReceiptInBrowser(file, (p) => setProgress(p));
        source = "tesseract";
      } catch (err) {
        setBusy(false);
        setFeedback({
          kind: "err",
          msg: err instanceof Error ? err.message : "OCR 실패",
        });
        return;
      }
    }

    setBusy(false);
    setFeedback({ kind: "ok", source, data });
    onResult(data, source);
  }

  function trigger() {
    inputRef.current?.click();
  }

  return (
    <div className="rounded-lg border border-dashed border-primary-electric/40 bg-primary-electric/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles aria-hidden className="h-4 w-4 text-primary-electric" />
        <h4 className="text-body-md font-semibold text-on-surface">
          영수증 사진 자동 인식
        </h4>
        <span className="rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
          AI
        </span>
      </div>
      <p className="mb-3 text-label-sm text-on-surface-variant">
        사진을 업로드하면 일자·금액·VAT·거래처를 자동으로 읽어 폼에 채워 넣습니다.
        Gemini Vision 우선, 실패 시 Tesseract.js 로 자동 fallback.
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
        onClick={trigger}
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
        {busy
          ? progress > 0
            ? `Tesseract 인식 중 ${progress}%`
            : "분석 중…"
          : "영수증 사진 선택"}
      </button>

      {feedback?.kind === "ok" ? (
        <div className="mt-3 rounded border border-emerald-500/30 bg-emerald-500/5 p-3 text-label-sm">
          <div className="mb-1 inline-flex items-center gap-1 font-semibold text-emerald-300">
            <Check aria-hidden className="h-4 w-4" />
            인식 완료
            <span className="ml-1 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
              {feedback.source === "gemini"
                ? "Gemini"
                : feedback.source === "tesseract"
                  ? "Tesseract"
                  : "?"}
            </span>
          </div>
          <ul className="space-y-0.5 text-on-surface-variant">
            <li>일자: {feedback.data.date ?? "—"}</li>
            <li>
              공급가/VAT/총액:{" "}
              {feedback.data.amount?.toLocaleString("ko-KR") ?? "—"} /{" "}
              {feedback.data.vat?.toLocaleString("ko-KR") ?? "—"} /{" "}
              {feedback.data.total?.toLocaleString("ko-KR") ?? "—"} 원
            </li>
            <li>거래처: {feedback.data.vendor_name ?? "—"}</li>
            <li>
              결제수단:{" "}
              {feedback.data.payment_method ?? "—"}
            </li>
          </ul>
          <p className="mt-2 inline-flex items-center gap-1 text-on-surface-variant/70">
            <Wand2 aria-hidden className="h-3 w-3" />
            결과가 폼에 자동 입력되었습니다. 확인 후 저장하세요.
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
