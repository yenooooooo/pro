"use client";

import { useEffect, useState, useTransition } from "react";
import { MessageSquare, Send, Loader2, AtSign, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  addCommentAction,
  deleteCommentAction,
} from "@/app/(dashboard)/comments/actions";

type Comment = {
  id: string;
  author_email: string;
  body: string;
  mentions: string[];
  created_at: string;
  edited_at: string | null;
};

type Props = {
  entityType:
    | "approval_request"
    | "expense"
    | "asset"
    | "employee"
    | "vendor"
    | "leave_request"
    | "closing_history";
  entityId: string;
  /** 현재 사용자 이메일 — 본인 댓글 삭제 버튼용 */
  currentUserEmail?: string | null;
};

export function CommentThread({ entityType, entityId, currentUserEmail }: Props) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 초기 로드
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .schema("chongmu")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("comments" as any)
        .select("id, author_email, body, mentions, created_at, edited_at")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId)
        .order("created_at", { ascending: true });
      if (!cancelled && data) {
        setComments(data as unknown as Comment[]);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [entityType, entityId]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!body.trim()) return;

    // @멘션 추출
    const mentions = Array.from(
      new Set(
        Array.from(body.matchAll(/@([\w.-]+@[\w.-]+\.\w+)/g)).map((m) => m[1]),
      ),
    );

    startTransition(async () => {
      const result = await addCommentAction({
        entityType,
        entityId,
        body: body.trim(),
        mentions,
      });
      if (result.ok && result.comment) {
        setComments((prev) => [...prev, result.comment as Comment]);
        setBody("");
      } else if (!result.ok) {
        setError(result.error);
      }
    });
  }

  function remove(id: string) {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;
    startTransition(async () => {
      const result = await deleteCommentAction(id);
      if (result.ok) {
        setComments((prev) => prev.filter((c) => c.id !== id));
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="glass-panel rounded-xl p-5">
      <header className="mb-4 flex items-center gap-2">
        <MessageSquare aria-hidden className="h-5 w-5 text-on-surface-variant" />
        <h3 className="text-headline-md font-semibold text-on-surface">
          댓글
        </h3>
        <span className="ml-auto rounded bg-surface-container-high px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {comments.length}
        </span>
      </header>

      {comments.length === 0 ? (
        <p className="mb-4 rounded border border-outline-variant/20 bg-surface-container-low p-4 text-center text-body-md text-on-surface-variant">
          아직 댓글이 없습니다.
        </p>
      ) : (
        <ul className="mb-4 space-y-3">
          {comments.map((c) => {
            const isOwn = currentUserEmail === c.author_email;
            return (
              <li
                key={c.id}
                className="rounded-lg border border-outline-variant/20 bg-surface-container-low p-3"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-label-sm font-semibold text-primary-electric">
                    {c.author_email}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-label-sm text-on-surface-variant/60 tabular-nums">
                      {formatDate(c.created_at)}
                      {c.edited_at ? " · 수정됨" : ""}
                    </span>
                    {isOwn ? (
                      <button
                        type="button"
                        onClick={() => remove(c.id)}
                        aria-label="댓글 삭제"
                        className="rounded p-1 text-on-surface-variant/60 hover:bg-error-soft/10 hover:text-error-soft"
                      >
                        <Trash2 aria-hidden className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <p className="whitespace-pre-wrap text-body-md text-on-surface">
                  {renderBody(c.body, c.mentions)}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="댓글 작성… (@email 로 멘션 가능)"
          rows={2}
          className="w-full resize-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-2 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
        />
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant/60">
            <AtSign aria-hidden className="h-3.5 w-3.5" />
            @로 멘션 가능 (이메일 형식)
          </span>
          <button
            type="submit"
            disabled={pending || !body.trim()}
            className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Send aria-hidden className="h-4 w-4" />
            )}
            등록
          </button>
        </div>
        {error ? (
          <p className="text-label-sm text-error-soft">{error}</p>
        ) : null}
      </form>
    </section>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = Date.now();
  const diff = now - d.getTime();
  if (diff < 60_000) return "방금";
  if (diff < 60 * 60_000) return `${Math.floor(diff / 60_000)}분 전`;
  if (diff < 24 * 60 * 60_000) return `${Math.floor(diff / (60 * 60_000))}시간 전`;
  return d.toISOString().slice(0, 10).replace(/-/g, ".");
}

/** @멘션 하이라이트 */
function renderBody(body: string, _mentions: string[]): React.ReactNode {
  const parts = body.split(/(@[\w.-]+@[\w.-]+\.\w+)/g);
  return parts.map((p, i) => {
    if (p.startsWith("@")) {
      return (
        <span
          key={i}
          className="rounded bg-primary-electric/15 px-1 font-semibold text-primary-electric"
        >
          {p}
        </span>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
