"use client";

import { useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Send,
  Loader2,
  X,
  AlertCircle,
  TableProperties,
  Zap,
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

type AnswerMeta = {
  query: { table: string; description: string } | null;
  rows: Record<string, unknown>[] | null;
  source: "gemini" | "fallback" | "no-key";
  cached: boolean;
};

type Stage = "intent" | "query" | "answer";

const STAGE_LABEL: Record<Stage, string> = {
  intent: "질문 분석 중…",
  query: "데이터 조회 중…",
  answer: "답변 작성 중…",
};

export function AskNexusModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [answerText, setAnswerText] = useState("");
  const [meta, setMeta] = useState<AnswerMeta | null>(null);
  const [stage, setStage] = useState<Stage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setAnswerText("");
      setMeta(null);
      setStage(null);
      setError(null);
      setPending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      // 모달 닫힐 때 진행 중 요청 중단
      abortRef.current?.abort();
      abortRef.current = null;
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

  async function submit(q: string) {
    const cleaned = q.trim();
    if (cleaned.length < 2) return;

    // 이전 요청 중단
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setAnswerText("");
    setMeta(null);
    setStage("intent");
    setPending(true);

    try {
      const res = await fetch("/api/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: cleaned }),
        signal: controller.signal,
      });

      if (!res.ok && res.status !== 200) {
        const errJson = await res.json().catch(() => null);
        setError(errJson?.error ?? `요청 실패 (${res.status})`);
        setPending(false);
        setStage(null);
        return;
      }

      if (!res.body) {
        setError("응답 본문 없음");
        setPending(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let collectedAnswer = "";
      let collectedMeta: AnswerMeta = {
        query: null,
        rows: null,
        source: "gemini",
        cached: false,
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // 라인 단위로 파싱 (NDJSON)
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          let event: Record<string, unknown>;
          try {
            event = JSON.parse(line) as Record<string, unknown>;
          } catch {
            continue;
          }

          const type = event.type as string;
          switch (type) {
            case "progress":
              setStage(event.stage as Stage);
              break;
            case "meta":
              collectedMeta = {
                ...collectedMeta,
                query: (event.query as AnswerMeta["query"]) ?? null,
                rows: (event.rows as Record<string, unknown>[]) ?? null,
              };
              setMeta(collectedMeta);
              break;
            case "chunk":
              collectedAnswer += String(event.text ?? "");
              setAnswerText(collectedAnswer);
              break;
            case "cached":
              collectedAnswer = String(event.answer ?? "");
              setAnswerText(collectedAnswer);
              collectedMeta = {
                ...collectedMeta,
                query: (event.query as AnswerMeta["query"]) ?? null,
                rows: (event.rows as Record<string, unknown>[]) ?? null,
                cached: true,
              };
              setMeta(collectedMeta);
              break;
            case "error":
              setError(String(event.message ?? "처리 실패"));
              break;
            case "done":
              collectedMeta = {
                ...collectedMeta,
                source: (event.source as AnswerMeta["source"]) ?? "gemini",
                cached: Boolean(event.cached),
              };
              setMeta(collectedMeta);
              break;
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "네트워크 오류");
    } finally {
      setPending(false);
      setStage(null);
    }
  }

  if (!open) return null;

  const hasAnswer = answerText.length > 0;

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

          {/* 진행 상태 — 답변 시작 전까지만 표시 */}
          {pending && stage && !hasAnswer ? (
            <div className="inline-flex items-center gap-2 rounded-lg border border-primary-electric/20 bg-primary-electric/5 px-3 py-2 text-label-sm text-primary-electric">
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              {STAGE_LABEL[stage]}
            </div>
          ) : null}

          {!hasAnswer && !pending && !error ? (
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

          {hasAnswer ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-primary-electric/30 bg-primary-electric/5 p-4">
                <div className="mb-2 inline-flex items-center gap-1.5 text-label-sm text-primary-electric">
                  <Sparkles aria-hidden className="h-4 w-4" />
                  답변
                  <span className="ml-1 rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {meta?.source === "gemini"
                      ? "Gemini"
                      : meta?.source === "fallback"
                        ? "Fallback"
                        : "—"}
                  </span>
                  {meta?.cached ? (
                    <span
                      title="5분 캐시 — 즉시 응답"
                      className="ml-0.5 inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300"
                    >
                      <Zap aria-hidden className="h-2.5 w-2.5" />
                      Cached
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                  {answerText}
                  {pending ? (
                    <span
                      aria-hidden
                      className="ml-0.5 inline-block h-4 w-1.5 -translate-y-0.5 animate-pulse bg-primary-electric/60 align-middle"
                    />
                  ) : null}
                </p>
              </div>
              {meta?.query ? (
                <p className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant">
                  <TableProperties aria-hidden className="h-3.5 w-3.5" />
                  데이터 출처: {meta.query.description}
                </p>
              ) : null}
              {meta?.rows && meta.rows.length > 0 ? (
                <details className="rounded border border-outline-variant/20 bg-surface-container-low p-3">
                  <summary className="cursor-pointer text-label-sm text-on-surface-variant">
                    원본 데이터 보기 ({meta.rows.length}행)
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto text-[11px] text-on-surface-variant">
                    {JSON.stringify(meta.rows, null, 2)}
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
