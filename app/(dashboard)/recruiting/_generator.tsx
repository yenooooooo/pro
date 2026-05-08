"use client";

import { useState, useTransition } from "react";
import { Sparkles, Loader2, Copy, Check, AlertCircle } from "lucide-react";

export function JobPostingGenerator() {
  const [department, setDepartment] = useState("");
  const [position, setPosition] = useState("");
  const [requirements, setRequirements] = useState("");
  const [preferred, setPreferred] = useState("");
  const [notes, setNotes] = useState("");

  const [posting, setPosting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPosting(null);
    if (!department || !position || !requirements) {
      setError("부서·직급·필수 요구사항을 입력하세요.");
      return;
    }
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/generate-job-posting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            department,
            position,
            requirements,
            preferred: preferred || undefined,
            additional_notes: notes || undefined,
          }),
        });
        const json = await res.json();
        if (json.ok) setPosting(json.posting);
        else if (json.source === "no-key") {
          setError("GEMINI_API_KEY 미설정 — AI 기능 비활성화");
        } else setError(json.error ?? "생성 실패");
      } catch (err) {
        setError(err instanceof Error ? err.message : "네트워크 오류");
      }
    });
  }

  async function copy() {
    if (!posting) return;
    await navigator.clipboard.writeText(posting);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid grid-cols-1 gap-gutter lg:grid-cols-12">
      <form onSubmit={generate} className="lg:col-span-5 space-y-4 glass-panel rounded-xl p-6">
        <h2 className="text-headline-md font-semibold text-on-surface">
          입력
        </h2>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            부서 *
          </label>
          <input
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder="예: 개발 / 영업 / 경영지원"
            className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            직급 *
          </label>
          <input
            value={position}
            onChange={(e) => setPosition(e.target.value)}
            placeholder="예: 대리 / 과장 / 시니어 백엔드 엔지니어"
            className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            필수 요구사항 *
          </label>
          <textarea
            value={requirements}
            onChange={(e) => setRequirements(e.target.value)}
            placeholder="예: Next.js · TypeScript 3년 이상 / 한국어 의사소통 가능"
            rows={3}
            className="mt-1 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            우대 사항
          </label>
          <textarea
            value={preferred}
            onChange={(e) => setPreferred(e.target.value)}
            placeholder="예: AWS · Docker 경험 / 영어 가능"
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        <div>
          <label className="block text-label-sm font-semibold text-on-surface-variant">
            추가 메모
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="예: 원격 근무 가능 / 스톡옵션 부여"
            rows={2}
            className="mt-1 w-full resize-y rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles aria-hidden className="h-4 w-4" />
          )}
          생성하기
        </button>

        {error ? (
          <p className="inline-flex items-center gap-1 text-body-md text-error-soft">
            <AlertCircle aria-hidden className="h-4 w-4" />
            {error}
          </p>
        ) : null}
      </form>

      <div className="glass-panel rounded-xl p-6 lg:col-span-7">
        <header className="mb-3 flex items-center justify-between">
          <h2 className="text-headline-md font-semibold text-on-surface">
            결과
          </h2>
          {posting ? (
            <button
              type="button"
              onClick={copy}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
            >
              {copied ? (
                <Check aria-hidden className="h-4 w-4" />
              ) : (
                <Copy aria-hidden className="h-4 w-4" />
              )}
              {copied ? "복사됨" : "복사"}
            </button>
          ) : null}
        </header>

        {posting ? (
          <pre className="max-h-[60vh] overflow-y-auto whitespace-pre-wrap rounded-lg border border-outline-variant/30 bg-surface-container-low p-4 text-label-sm leading-relaxed text-on-surface">
            {posting}
          </pre>
        ) : pending ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 text-on-surface-variant">
            <Loader2 aria-hidden className="h-8 w-8 animate-spin" />
            <p>Gemini 가 공고를 작성 중입니다…</p>
          </div>
        ) : (
          <p className="py-8 text-center text-body-md text-on-surface-variant">
            왼쪽에 정보를 입력하고 &quot;생성하기&quot;를 누르세요.
          </p>
        )}
      </div>
    </div>
  );
}
