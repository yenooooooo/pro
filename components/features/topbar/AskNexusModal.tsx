"use client";

import { useEffect, useRef, useState } from "react";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

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
  useBodyScrollLock(open);

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

      const handleEvent = (event: Record<string, unknown>) => {
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
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          // 마지막 partial 라인 flush
          const tail = buffer.trim();
          if (tail) {
            try {
              handleEvent(JSON.parse(tail) as Record<string, unknown>);
            } catch {
              /* 파싱 실패 — 무시 */
            }
          }
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        // 라인 단위로 파싱 (NDJSON)
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            handleEvent(JSON.parse(line) as Record<string, unknown>);
          } catch {
            /* 파싱 실패 — 다음 라인 */
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
      className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/[0.78] px-6 pt-24 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] border border-line-2 bg-bg-1 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-modal-in"
      >
        {/* Inner gold-soft rim */}
        <div aria-hidden className="pointer-events-none absolute inset-0 border border-gold/15" />

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center border border-line text-text-3 hover:border-line-2 hover:text-text-1"
        >
          ✕
        </button>

        {/* Header */}
        <div className="border-b border-line px-6 py-5">
          <div className="eyebrow">
            <b>·</b>AI · Natural Language Query
          </div>
          <h2 className="mt-2 font-serif text-[28px] italic text-text-1">
            Ask <em className="text-gold">Nexus.</em>
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            ERP 데이터에 자연어로 질문 · Gemini streaming · 5min cache
          </p>
        </div>

        {/* Body */}
        <div className="space-y-4 p-6">
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
              className="w-full resize-none border border-line bg-bg p-3 font-mono text-[13px] text-text-1 placeholder:text-text-4 focus:border-gold focus:outline-none"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                <kbd className="border border-line bg-bg px-1.5 py-0.5 text-text-2">
                  Ctrl
                </kbd>
                {" + "}
                <kbd className="border border-line bg-bg px-1.5 py-0.5 text-text-2">
                  Enter
                </kbd>
                {" "}to send
              </span>
              <button
                type="button"
                onClick={() => submit(query)}
                disabled={pending || query.trim().length < 2}
                className="btn btn-primary disabled:opacity-50"
              >
                <span>✦</span>
                {pending ? "전송 중…" : "질문하기"}
              </button>
            </div>
          </div>

          {/* 진행 상태 — 답변 시작 전까지만 표시 */}
          {pending && stage && !hasAnswer ? (
            <div className="inline-flex items-center gap-2 border border-gold-soft/40 bg-gold/[0.06] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.12em] text-gold">
              <span className="animate-pulse">▌</span>
              {STAGE_LABEL[stage]}
            </div>
          ) : null}

          {!hasAnswer && !pending && !error ? (
            <div>
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
                <span className="mr-3 text-gold">·</span>Suggestions
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
                    className="chip hover:border-gold-soft hover:text-gold"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {error ? (
            <div className="inline-flex items-center gap-2 border border-[rgba(224,107,95,0.35)] bg-[rgba(224,107,95,0.06)] px-3 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-[#e06b5f]">
              <span>!</span>
              {error}
            </div>
          ) : null}

          {hasAnswer ? (
            <div className="space-y-3">
              <div className="border border-gold-soft/50 bg-gold/[0.06] p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="font-serif text-[15px] italic text-gold">
                    ✦ 답변
                  </span>
                  <span className="chip pend">
                    {meta?.source === "gemini"
                      ? "Gemini"
                      : meta?.source === "fallback"
                        ? "Fallback"
                        : "—"}
                  </span>
                  {meta?.cached ? (
                    <span
                      title="5분 캐시 — 즉시 응답"
                      className="chip ok"
                    >
                      ⚡ Cached
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-[14px] leading-[1.6] text-text-1">
                  {answerText}
                  {pending ? (
                    <span
                      aria-hidden
                      className="ml-1 inline-block animate-pulse font-mono text-gold"
                    >
                      ▌
                    </span>
                  ) : null}
                </p>
              </div>
              {meta?.query ? (
                <p className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
                  <span className="text-gold">·</span>
                  Source: {meta.query.description}
                </p>
              ) : null}
              {meta?.rows && meta.rows.length > 0 ? (
                <details className="border border-line bg-bg p-3">
                  <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.12em] text-text-2 hover:text-gold">
                    Raw data ({meta.rows.length} rows)
                  </summary>
                  <pre className="mt-2 max-h-60 overflow-auto font-mono text-[11px] text-text-2">
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
