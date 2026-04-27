"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import { toggleClosingTask } from "../actions";

type Props = {
  year: number;
  month: number;
  taskId: string;
  taskTitle: string;
  isDone: boolean;
};

export function TaskToggle({ year, month, taskId, taskTitle, isDone }: Props) {
  const [pending, startTransition] = useTransition();

  function onToggle() {
    if (pending) return;
    startTransition(async () => {
      const result = await toggleClosingTask(year, month, taskId);
      if (!result.success) {
        toast.error(`상태 변경 실패: ${result.error}`);
        return;
      }
      toast.success(
        result.is_done ? `${taskTitle} 완료 처리` : `${taskTitle} 미완료로 변경`,
      );
    });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      role="switch"
      aria-checked={isDone}
      aria-label={`${taskTitle} ${isDone ? "완료" : "미완료"}`}
      className="relative z-10 ml-4 flex-shrink-0 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <div
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors",
          isDone
            ? "border-transparent bg-primary-electric/50"
            : "border-outline-variant bg-surface-container-highest",
        )}
      >
        <div
          className={cn(
            "absolute top-[2px] h-5 w-5 rounded-full border transition-all",
            isDone
              ? "left-[calc(100%-1.375rem)] border-white bg-primary-electric"
              : "left-[2px] border-on-surface-variant bg-on-surface-variant",
          )}
        />
      </div>
    </button>
  );
}
