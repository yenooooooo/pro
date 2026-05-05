"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  X,
  AlertCircle,
  TableProperties,
} from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

const SUGGESTIONS = [
  "개발팀 평균 기본급은 얼마야?",
  "이번 달 미확정 급여 몇 건이야?",
  "최근 3개월 동안 가장 많이 쓴 지출 카테고리는?",
  "강민준의 5월 연장근로 시간이 어떻게 돼?",
];

type Answer = {
  answer: string;
  query: { table: string; description: string } | null;
  rows: Record<string, unknown>[] | null;
  source: "gemini" | "fallback" | "no-key";
};

export function AskNexusModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setAnswer(null);
      setError(null);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function submit(q: string) {
    const cleaned = q.trim();
    if (cleaned.length < 2) return;
    setError(null);
    setAnswer(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/ai/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: cleaned }),
        });
        const json = await res.json();
        if (json.source === "no-key") {
          // 정규식 fallback (제한적)
          const fb = await fallbackParse(cleaned);
          setAnswer({
            answer:
              fb ??
              "현재 GEMINI_API_KEY 가 설정되지 않아 AI 분석이 비활성화되어 있습니다. 환경변수를 추가하면 자연어 질의가 동작합니다.",
            query: null,
            rows: null,
            source: "fallback",
          });
          return;
        }
        if (!json.ok) {
          setError(json.error ?? "처리 실패");
          return;
        }
        setAnswer(json as Answer);
      } catch (err) {
        setError(err instanceof Error ? err.message : "네트워크 오류");
      }
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask Nexus"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-20 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles aria-hidden className="h-5 w-5 text-primary-electric" />
            <div>
              <h2 className="text-headline-md font-semibold text-on-surface">
                Ask Nexus
              </h2>
              <p className="mt-0.5 text-label-sm text-on-surface-variant">
                ERP 데이터에 자연어로 질문하세요. Gemini 무료 tier 기반.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <textarea
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === "Enter") submit(query);
              }}
              placeholder="예: '개발팀 평균 기본급', '강민준의 5월 연장근로'"
              rows={2}
              className="w-full resize-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none placeholder:text-on-surface-variant/60 focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-label-sm text-on-surface-variant">
                <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1 py-0.5 font-mono text-[10px]">
                  Ctrl
                </kbd>{" "}
                +{" "}
                <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1 py-0.5 font-mono text-[10px]">
                  Enter
                </kbd>{" "}
                로 전송
              </span>
              <button
                type="button"
                onClick={() => submit(query)}
                disabled={pending || query.trim().length < 2}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Send aria-hidden className="h-4 w-4" />
                )}
                질문하기
              </button>
            </div>
          </div>

          {!answer && !pending && !error ? (
            <div>
              <p className="mb-2 text-label-sm uppercase tracking-widest text-on-surface-variant">
                추천 질문
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setQuery(s);
                      submit(s);
                    }}
                    className="rounded-full border border-outline-variant/30 bg-surface-container-low px-3 py-1.5 text-label-sm text-on-surface-variant transition-colors hover:border-primary-electric/40 hover:bg-primary-electric/10 hover:text-primary-electric"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="inline-flex items-center gap-2 rounded border border-error-soft/30 bg-error-soft/5 px-3 py-2 text-body-md text-error-soft">
              <AlertCircle aria-hidden className="h-4 w-4" />
              {error}
            </div>
          ) : null}

          {answer ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary-electric/30 bg-primary-electric/5 p-4">
                <div className="mb-2 inline-flex items-center gap-1 text-label-sm text-primary-electric">
                  <Sparkles aria-hidden className="h-4 w-4" />
                  답변
                  <span className="ml-1 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {answer.source === "gemini"
                      ? "Gemini"
                      : answer.source === "fallback"
                        ? "Fallback"
                        : "—"}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                  {answer.answer}
                </p>
              </div>
              {answer.query ? (
                <p className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
                  <TableProperties aria-hidden className="h-3.5 w-3.5" />
                  데이터 출처: {answer.query.description}
                </p>
              ) : null}
              {answer.rows && answer.rows.length > 0 ? (
                <details className="rounded border border-outline-variant/20 bg-surface-container-low p-3">
                  <summary className="cursor-pointer text-label-sm text-on-surface-variant">
                    원본 데이터 보기 ({answer.rows.length}행)
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto text-[11px] text-on-surface-variant">
                    {JSON.stringify(answer.rows, null, 2)}
                  </pre>
                </details>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** 정규식 기반 매우 제한적 fallback. Gemini 키 없을 때만 사용. */
async function fallbackParse(query: string): Promise<string | null> {
  // 매우 단순한 패턴 몇 개만 — wow 효과는 없음. UI에서 안내문 보여주는 용도.
  if (/이번\s*달.*미확정/.test(query)) {
    return "GEMINI_API_KEY 가 설정되어 있지 않아 정확한 답변은 못 드립니다. 대시보드 우상단 종 아이콘에서 미확정 급여 알림을 확인하세요.";
  }
  return null;
}
