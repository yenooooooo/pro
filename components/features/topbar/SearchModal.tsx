"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search as SearchIcon, X } from "lucide-react";
import { globalSearchAction, type SearchHit } from "@/lib/search/actions";
import { cn } from "@/lib/utils/cn";

type Props = {
  open: boolean;
  onClose: () => void;
};

const TYPE_LABEL: Record<SearchHit["type"], string> = {
  employee: "직원",
  vendor: "거래처",
  asset: "자산",
  expense: "지출",
};

const TYPE_TONE: Record<SearchHit["type"], string> = {
  employee: "bg-primary-electric/15 text-primary-electric",
  vendor: "bg-tertiary/15 text-tertiary",
  asset: "bg-amber-500/15 text-amber-300",
  expense: "bg-emerald-500/15 text-emerald-300",
};

export function SearchModal({ open, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      // focus after paint
      setTimeout(() => inputRef.current?.focus(), 30);
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

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const results = await globalSearchAction(trimmed);
        setHits(results);
      });
    }, 220);
    return () => clearTimeout(handle);
  }, [query, open]);

  if (!open) return null;

  function navigate(href: string) {
    onClose();
    router.push(href as never);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="전역 검색"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 px-4 pt-24 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container shadow-2xl"
      >
        <div className="flex items-center gap-3 border-b border-outline-variant/30 px-4 py-3">
          <SearchIcon aria-hidden className="h-5 w-5 text-on-surface-variant" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="직원명, 거래처, 자산번호, 지출 설명…"
            className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
          />
          {pending ? (
            <Loader2
              aria-hidden
              className="h-4 w-4 animate-spin text-on-surface-variant"
            />
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <X aria-hidden className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto">
          {query.trim().length < 2 ? (
            <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
              두 글자 이상 입력하세요. (직원명, 거래처, 자산번호, 지출 설명 검색)
            </div>
          ) : hits.length === 0 && !pending ? (
            <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
              결과 없음
            </div>
          ) : (
            <ul className="divide-y divide-outline-variant/20">
              {hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => navigate(h.href)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-container-high"
                  >
                    <span
                      className={cn(
                        "rounded px-2 py-0.5 text-label-sm font-semibold uppercase tracking-wider",
                        TYPE_TONE[h.type],
                      )}
                    >
                      {TYPE_LABEL[h.type]}
                    </span>
                    <span className="flex-1 truncate">
                      <span className="block truncate text-body-md text-on-surface">
                        {h.title}
                      </span>
                      {h.subtitle ? (
                        <span className="block truncate text-label-sm text-on-surface-variant">
                          {h.subtitle}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low px-4 py-2 text-label-sm text-on-surface-variant">
          <span>
            <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono">
              Esc
            </kbd>{" "}
            닫기
          </span>
          <span>
            단축키{" "}
            <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono">
              Ctrl
            </kbd>{" "}
            +{" "}
            <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono">
              K
            </kbd>
          </span>
        </div>
      </div>
    </div>
  );
}
