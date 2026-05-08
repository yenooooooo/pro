"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toggleOnboardingTaskAction } from "../onboarding-actions";
import { cn } from "@/lib/utils/cn";

type Task = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_done: boolean;
  completed_at: string | null;
  note: string | null;
};

const CATEGORY_LABEL: Record<string, string> = {
  asset: "자산",
  account: "계좌",
  insurance: "4대보험",
  system: "시스템",
  document: "문서",
  other: "기타",
};

const CATEGORY_TONE: Record<string, string> = {
  asset: "bg-amber-500/15 text-amber-300",
  account: "bg-emerald-500/15 text-emerald-300",
  insurance: "bg-tertiary/15 text-tertiary",
  system: "bg-primary-electric/15 text-primary-electric",
  document: "bg-purple-500/15 text-purple-300",
  other: "bg-surface-container-high text-on-surface-variant",
};

type Props = {
  tasks: Task[];
  kind: "onboarding" | "offboarding";
  employeeId: string;
};

export function OnboardingTaskList({ tasks: initialTasks }: Props) {
  const [tasks, setTasks] = useState(initialTasks);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  function toggle(taskId: string, isDone: boolean) {
    setPendingId(taskId);
    startTransition(async () => {
      const result = await toggleOnboardingTaskAction({
        taskId,
        is_done: !isDone,
      });
      if (result.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  is_done: !isDone,
                  completed_at: !isDone ? new Date().toISOString() : null,
                }
              : t,
          ),
        );
      }
      setPendingId(null);
    });
  }

  return (
    <ul className="space-y-2">
      {tasks.map((t) => {
        const cat = t.category ?? "other";
        return (
          <li
            key={t.id}
            className={cn(
              "glass-panel flex items-start gap-3 rounded-xl p-4 transition-opacity",
              t.is_done && "opacity-70",
            )}
          >
            <button
              type="button"
              onClick={() => toggle(t.id, t.is_done)}
              disabled={pending && pendingId === t.id}
              aria-label={t.is_done ? "완료 취소" : "완료 처리"}
              className={cn(
                "mt-0.5 inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                t.is_done
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-outline-variant hover:border-primary-electric",
              )}
            >
              {pending && pendingId === t.id ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin text-on-surface" />
              ) : t.is_done ? (
                <Check aria-hidden className="h-4 w-4 text-on-primary" />
              ) : null}
            </button>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <p
                  className={cn(
                    "text-body-md font-semibold text-on-surface",
                    t.is_done && "line-through",
                  )}
                >
                  {t.title}
                </p>
                {t.category ? (
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                      CATEGORY_TONE[cat],
                    )}
                  >
                    {CATEGORY_LABEL[cat]}
                  </span>
                ) : null}
              </div>
              {t.description ? (
                <p className="mt-0.5 text-label-sm text-on-surface-variant">
                  {t.description}
                </p>
              ) : null}
              {t.completed_at ? (
                <p className="mt-1 text-label-sm text-on-surface-variant/60 tabular-nums">
                  완료 {t.completed_at.slice(0, 16).replace("T", " ")}
                </p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
