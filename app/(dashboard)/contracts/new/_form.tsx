"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Upload,
  Loader2,
  Save,
  AlertCircle,
} from "lucide-react";
import { saveContractAction } from "../actions";

type Vendor = { id: string; name: string };

type Props = {
  vendors: Vendor[];
};

export function ContractUploadForm({ vendors }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [ocrBusy, setOcrBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [contractType, setContractType] = useState("service");
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [signedDate, setSignedDate] = useState("");
  const [parties, setParties] = useState("");
  const [notes, setNotes] = useState("");

  async function handleOcr(file: File) {
    setOcrBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/ai/ocr/contract", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (json.ok && json.data) {
        const d = json.data;
        if (d.title) setTitle(d.title);
        if (d.contract_type) setContractType(d.contract_type);
        if (typeof d.amount === "number") setAmount(d.amount);
        if (d.start_date) setStartDate(d.start_date);
        if (d.end_date) setEndDate(d.end_date);
        if (d.signed_date) setSignedDate(d.signed_date);
        if (Array.isArray(d.parties)) setParties(d.parties.join(", "));
        if (d.notes) setNotes(d.notes);

        // 거래처 자동 매칭
        if (Array.isArray(d.parties)) {
          const matched = vendors.find((v) =>
            d.parties.some((p: string) =>
              p.replace(/\s/g, "") === v.name.replace(/\s/g, ""),
            ),
          );
          if (matched) setVendorId(matched.id);
        }
      } else if (json.source === "no-key") {
        setError("GEMINI_API_KEY 미설정 — OCR 기능 비활성화");
      } else {
        setError(json.error ?? "OCR 실패");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setOcrBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title) {
      setError("제목을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const result = await saveContractAction({
        title,
        contract_type: contractType,
        vendor_id: vendorId || null,
        amount: amount > 0 ? amount : null,
        start_date: startDate || null,
        end_date: endDate || null,
        signed_date: signedDate || null,
        parties: parties
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        notes: notes || null,
      });
      if (result.ok) {
        router.push("/contracts");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* OCR 박스 */}
      <div className="rounded-lg border border-dashed border-primary-electric/40 bg-primary-electric/5 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles aria-hidden className="h-4 w-4 text-primary-electric" />
          <h4 className="text-body-md font-semibold text-on-surface">
            계약서 자동 인식
          </h4>
          <span className="rounded bg-primary-electric/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-electric">
            AI
          </span>
        </div>
        <p className="mb-3 text-label-sm text-on-surface-variant">
          PDF 또는 이미지를 업로드하면 제목·당사자·금액·기간이 자동 입력됩니다.
        </p>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-primary-electric/40 bg-surface-container-low px-4 py-2 text-body-md text-on-surface transition-colors hover:bg-surface-container-high">
          {ocrBusy ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Upload aria-hidden className="h-4 w-4" />
          )}
          {ocrBusy ? "분석 중…" : "계약서 파일 선택 (PDF/이미지, 최대 10MB)"}
          <input
            type="file"
            accept="application/pdf,image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={ocrBusy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleOcr(f);
            }}
          />
        </label>
      </div>

      {/* 폼 */}
      <section className="glass-panel rounded-xl p-6 space-y-4">
        <h2 className="text-headline-md font-semibold text-on-surface">
          기본 정보
        </h2>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              제목 *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 클라우드 서비스 이용 계약서"
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              유형
            </label>
            <select
              value={contractType}
              onChange={(e) => setContractType(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            >
              <option value="service">용역</option>
              <option value="supply">공급</option>
              <option value="lease">임대차</option>
              <option value="employment">근로</option>
              <option value="nda">비밀유지</option>
              <option value="other">기타</option>
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              거래처
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            >
              <option value="">선택 안 함</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              계약 금액 (원)
            </label>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              체결일
            </label>
            <input
              type="date"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              시작일
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
              종료일
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
              당사자 (콤마 구분)
            </label>
            <input
              value={parties}
              onChange={(e) => setParties(e.target.value)}
              placeholder="예: 주식회사 네오비트, ABC컨설팅"
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              메모
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="자동연장 조항, 특이사항 등"
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
          저장
        </button>
      </div>
    </form>
  );
}
