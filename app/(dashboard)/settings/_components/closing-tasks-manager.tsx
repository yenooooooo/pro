"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Loader2, AlertCircle } from "lucide-react";
import {
  createClosingTaskAction,
  deleteClosingTaskAction,
} from "../actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
  order_no: number;
};

type Props = {
  tasks: Task[];
};

export function ClosingTasksManager({ tasks }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderNo, setOrderNo] = useState<number>(
    tasks.length > 0 ? Math.max(...tasks.map((t) => t.order_no)) + 1 : 1,
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      return;
    }
    startTransition(async () => {
      const result = await createClosingTaskAction({
        title: title.trim(),
        description: description.trim() || null,
        order_no: orderNo,
      });
      if (result.ok) {
        setTitle("");
        setDescription("");
        setOrderNo(orderNo + 1);
      } else {
        setError(result.error);
      }
    });
  }

  function remove(id: string) {
    if (!confirm("정말 삭제하시겠습니까? 결산 진행 이력이 있는 항목은 삭제할 수 없습니다.")) {
      return;
    }
    setError(null);
    setDeletingId(id);
    startTransition(async () => {
      const result = await deleteClosingTaskAction(id);
      if (!result.ok) setError(result.error);
      setDeletingId(null);
    });
  }

  return (
    <div className="space-y-5">
      <ul className="divide-y divide-outline-variant/30 overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-low">
        {tasks.length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-on-surface-variant">
            등록된 항목이 없습니다.
          </li>
        ) : (
          tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span className="mt-0.5 inline-flex h-7 min-w-[2.5rem] items-center justify-center rounded bg-primary-electric/15 px-2 text-label-sm font-semibold text-primary-electric tabular-nums">
                {t.order_no}
              </span>
              <div className="flex-1">
                <p className="text-body-md font-medium text-on-surface">{t.title}</p>
                {t.description ? (
                  <p className="mt-0.5 text-label-sm text-on-surface-variant">
                    {t.description}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => remove(t.id)}
                disabled={pending && deletingId === t.id}
                aria-label={`${t.title} 삭제`}
                className="inline-flex min-h-9 min-w-9 items-center justify-center rounded text-on-surface-variant transition-colors hover:bg-error-soft/10 hover:text-error-soft disabled:opacity-40"
              >
                {pending && deletingId === t.id ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 aria-hidden className="h-4 w-4" />
                )}
              </button>
            </li>
          ))
        )}
      </ul>

      <form onSubmit={add} className="rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
        <h3 className="mb-3 text-body-md font-semibold text-on-surface">
          항목 추가
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              제목 *
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 4대보험 신고"
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>
          <div>
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              설명
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 국민연금·건강보험·고용보험·산재 공제 파일 생성·제출"
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-body-md text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>
          <div className="md:w-28">
            <label className="block text-label-sm font-semibold text-on-surface-variant">
              순서
            </label>
            <input
              type="number"
              min={1}
              max={999}
              value={orderNo}
              onChange={(e) => setOrderNo(Number(e.target.value))}
              className="mt-1 min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container px-3 text-data-tabular tabular-nums text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
            />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div aria-live="polite" className="flex-1">
            {error ? (
              <p className="inline-flex items-center gap-2 text-body-md text-error-soft">
                <AlertCircle aria-hidden className="h-4 w-4" />
                {error}
              </p>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-4 py-2 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending && !deletingId ? (
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
            ) : (
              <Plus aria-hidden className="h-4 w-4" />
            )}
            추가
          </button>
        </div>
      </form>
    </div>
  );
}
