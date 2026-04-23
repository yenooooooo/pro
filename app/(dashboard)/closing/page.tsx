import {
  AlertTriangle,
  Check,
  ExternalLink,
  Lock,
  Play,
  ShieldCheck,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatKRW } from "@/lib/utils/format";

type TaskStatus = "done" | "active" | "pending";

type ClosingTask = {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee?: string;
  completedAt?: string;
  actionLabel?: string;
};

// Phase 6에서 Supabase closing_history 조회로 교체.
const TASKS: ClosingTask[] = [
  {
    id: "1",
    title: "근태 마감",
    description: "월별 출퇴근·연장근로 기록을 부서장이 승인하여 잠금 처리.",
    status: "done",
    assignee: "이서연",
    completedAt: "04.28 14:30",
  },
  {
    id: "2",
    title: "연차 현황 확인",
    description: "연차·병가 발생·사용 내역이 정책과 일치하는지 대조.",
    status: "done",
  },
  {
    id: "3",
    title: "급여 계산",
    description: "급여 엔진을 실행해 이상치를 검토하고 계산을 확정.",
    status: "active",
    actionLabel: "엔진 실행",
  },
  {
    id: "4",
    title: "4대보험 신고",
    description: "국민연금·건강보험·고용보험·산재 공제 파일을 생성·제출.",
    status: "pending",
  },
  {
    id: "5",
    title: "지출 정산",
    description: "승인된 법인카드·경비 지출을 환급 대기열로 이관.",
    status: "done",
  },
  {
    id: "6",
    title: "원천세 확인",
    description: "간이세액표·지방소득세 계산이 국세청 기준과 일치하는지 대조.",
    status: "done",
  },
  {
    id: "7",
    title: "복리후생 정산",
    description: "건강·연금 부담금이 보험사 청구서와 일치하는지 확인.",
    status: "done",
  },
  {
    id: "8",
    title: "회계 장부 내보내기",
    description: "급여 항목을 회계 계정과목에 매핑하여 전표 생성.",
    status: "done",
  },
];

const DONE_COUNT = TASKS.filter((t) => t.status === "done").length;
const PENDING_COUNT = TASKS.filter((t) => t.status !== "done").length;
const TOTAL = TASKS.length;
const PROGRESS_PCT = Math.round((DONE_COUNT / TOTAL) * 100);

// SVG radial — r=44 → circumference ≈ 276.46
const RADIUS = 44;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DASH_OFFSET = CIRCUMFERENCE * (1 - PROGRESS_PCT / 100);

export default function ClosingPage() {
  return (
    <div className="grid grid-cols-1 gap-gutter xl:grid-cols-12">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end xl:col-span-12">
        <div>
          <h1 className="mb-2 text-headline-lg font-bold tracking-tight text-white sm:text-display-xl sm:text-5xl">
            Monthly Closing Center
          </h1>
          <p className="max-w-2xl text-body-lg text-on-surface-variant">
            2026년 4월 결산을 실행합니다. 최종 확정 전 모든 항목이 정합성을 갖추었는지 확인하세요.
          </p>
        </div>
        <div className="glass-panel flex items-center gap-3 rounded-lg px-6 py-3">
          <span className="relative flex h-3 w-3" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tertiary-sky opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-tertiary-sky" />
          </span>
          <span className="text-label-sm uppercase tracking-wider text-tertiary-sky">
            실시간 기록 중
          </span>
        </div>
      </div>

      {/* LEFT: Progress + Report Preview */}
      <div className="flex flex-col gap-gutter xl:col-span-4">
        {/* Radial Gauge */}
        <div className="glass-panel group relative flex flex-col items-center justify-center overflow-hidden rounded-xl p-6">
          <div
            aria-hidden
            className="absolute inset-0 bg-gradient-to-br from-primary-electric/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
          <h2 className="mb-6 w-full text-headline-md font-semibold text-white">
            결산 현황
          </h2>
          <div className="relative mb-4 flex h-48 w-48 items-center justify-center">
            <svg className="h-full w-full" viewBox="0 0 100 100" role="img" aria-label={`결산 ${PROGRESS_PCT}% 완료`}>
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="transparent"
                strokeWidth="6"
                className="stroke-surface-container-highest"
              />
              <circle
                cx="50"
                cy="50"
                r={RADIUS}
                fill="transparent"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={DASH_OFFSET}
                className="stroke-primary-electric drop-shadow-[0_0_8px_rgba(192,193,255,0.6)] transition-[stroke-dashoffset] duration-500"
                style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-[40px] font-bold leading-none tabular-nums text-white">
                {PROGRESS_PCT}%
              </span>
              <span className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">
                완료
              </span>
            </div>
          </div>
          <div className="mt-2 flex w-full items-center justify-between px-2">
            <GaugeStat label="완료" value={DONE_COUNT} />
            <div aria-hidden className="h-8 w-px bg-outline-variant" />
            <GaugeStat label="대기" value={PENDING_COUNT} tone="tertiary" />
            <div aria-hidden className="h-8 w-px bg-outline-variant" />
            <GaugeStat label="전체" value={TOTAL} />
          </div>
        </div>

        {/* Report Preview */}
        <div className="glass-panel flex flex-1 flex-col rounded-xl p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-headline-md font-semibold text-white">리포트 미리보기</h2>
            <button
              type="button"
              aria-label="리포트 새 창으로 열기"
              className="text-primary-electric transition-colors hover:text-primary-container"
            >
              <ExternalLink className="h-5 w-5" />
            </button>
          </div>
          <div className="relative flex flex-1 flex-col overflow-hidden rounded-lg border border-outline-variant/30 bg-surface-container-low p-4">
            <div className="relative z-10 space-y-4">
              <PreviewRow label="총 급여" value={formatKRW(214_580_000)} />
              <PreviewRow label="연장근로 시간" value="1,420 시간" />
              <PreviewRow label="신규 입사" value="3 명" />
            </div>
            <div className="mt-auto pt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-error-soft">
                <AlertTriangle aria-hidden className="h-4 w-4" />
                미리보기 불완전 · 남은 체크리스트를 완료하세요
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Interactive Checklist */}
      <div className="flex flex-col gap-4 xl:col-span-8">
        <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
          <h3 className="text-[18px] font-semibold text-white">운영 체크리스트</h3>
          <button
            type="button"
            className="rounded bg-primary-electric/10 px-3 py-1 text-label-sm text-primary-electric transition-colors hover:text-primary-container"
          >
            대기 항목만
          </button>
        </div>

        <ul className="mt-2 space-y-3">
          {TASKS.map((t) => (
            <ClosingTaskCard key={t.id} task={t} />
          ))}
        </ul>

        {/* Final action */}
        <div className="mt-8 flex flex-col items-center justify-between gap-6 border-t border-outline-variant/30 pt-6 md:flex-row">
          <div className="flex max-w-md items-start gap-2 text-sm text-on-surface-variant">
            <Lock aria-hidden className="mt-1 h-4 w-4 flex-shrink-0 text-tertiary-sky" />
            <span>
              확정 시 2026년 4월의 모든 기록이 잠기며 규정 준수 문서가 생성됩니다. 경영진 인증이
              필요합니다.
            </span>
          </div>
          <button
            type="button"
            disabled
            className="group relative cursor-not-allowed overflow-hidden rounded-lg border border-outline-variant/50 bg-surface-container-high px-8 py-4 opacity-50"
          >
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-primary-electric to-inverse-primary opacity-0 transition-opacity duration-300"
            />
            <div className="relative z-10 flex items-center gap-3">
              <span className="text-[18px] font-semibold text-white">월말 마감 확정</span>
              <ShieldCheck className="h-5 w-5 text-white" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function GaugeStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "tertiary";
}) {
  return (
    <div className="flex flex-col items-center">
      <span
        className={cn(
          "text-[20px] font-semibold tabular-nums",
          tone === "tertiary" ? "text-tertiary-sky" : "text-white",
        )}
      >
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-outline">{label}</span>
    </div>
  );
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-end justify-between border-b border-outline-variant/30 pb-2">
      <span className="text-data-tabular text-on-surface-variant">{label}</span>
      <span className="text-[22px] font-semibold tabular-nums text-white">{value}</span>
    </div>
  );
}

function ClosingTaskCard({ task }: { task: ClosingTask }) {
  const isDone = task.status === "done";
  const isActive = task.status === "active";

  return (
    <li
      className={cn(
        "glass-panel relative flex items-center justify-between overflow-hidden rounded-lg p-4 transition-colors",
        isDone && "opacity-60 hover:bg-surface-container-highest/50",
        isActive &&
          "border-l-4 border-l-tertiary-sky bg-surface-container-highest/20 shadow-[0_4px_20px_rgba(123,208,255,0.05)]",
        task.status === "pending" &&
          "border-l-4 border-l-transparent hover:bg-surface-container-highest/30",
      )}
    >
      {isActive ? (
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 h-full w-full bg-gradient-to-r from-tertiary-sky/5 to-transparent"
        />
      ) : null}

      <div className="relative z-10 flex flex-1 items-start gap-4">
        <TaskStatusIcon status={task.status} />
        <div className="min-w-0 flex-1">
          <h4
            className={cn(
              "text-[16px] font-medium tabular-nums text-white",
              isDone && "text-white line-through decoration-outline-variant",
              isActive && "font-semibold",
            )}
          >
            {task.title}
          </h4>
          <p className="mt-1 text-[13px] text-on-surface-variant">{task.description}</p>

          {(task.assignee || task.completedAt) && (
            <div className="mt-2 flex flex-wrap gap-3 text-[11px] font-semibold uppercase tracking-wider text-outline">
              {task.assignee ? (
                <span className="flex items-center gap-1">
                  <User aria-hidden className="h-3 w-3" />
                  {task.assignee}
                </span>
              ) : null}
              {task.completedAt ? <span>{task.completedAt}</span> : null}
            </div>
          )}

          {task.actionLabel ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex min-h-11 items-center gap-1 rounded border border-outline-variant bg-surface-container-low px-3 py-1.5 text-[12px] font-medium text-white transition-colors hover:bg-surface-variant"
              >
                <Play aria-hidden className="h-[14px] w-[14px]" />
                {task.actionLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <TaskToggle status={task.status} />
    </li>
  );
}

function TaskStatusIcon({ status }: { status: TaskStatus }) {
  if (status === "done") {
    return (
      <div className="mt-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-primary-electric bg-primary-electric/20 text-primary-electric">
        <Check aria-hidden className="h-[14px] w-[14px]" strokeWidth={3} />
      </div>
    );
  }
  if (status === "active") {
    return (
      <div className="mt-1 flex h-6 w-6 flex-shrink-0 animate-pulse items-center justify-center rounded-full border-2 border-tertiary-sky">
        <div aria-hidden className="h-2 w-2 rounded-full bg-tertiary-sky" />
      </div>
    );
  }
  return (
    <div
      aria-hidden
      className="mt-1 h-6 w-6 flex-shrink-0 rounded-full border-2 border-outline-variant"
    />
  );
}

function TaskToggle({ status }: { status: TaskStatus }) {
  const isChecked = status === "done";
  return (
    <div aria-hidden className="relative z-10 ml-4">
      <div
        className={cn(
          "relative h-6 w-11 rounded-full border transition-colors",
          isChecked
            ? "border-transparent bg-primary-electric/50"
            : "border-outline-variant bg-surface-container-highest",
        )}
      >
        <div
          className={cn(
            "absolute top-[2px] h-5 w-5 rounded-full border transition-all",
            isChecked
              ? "left-[calc(100%-1.375rem)] border-white bg-primary-electric"
              : "left-[2px] border-on-surface-variant bg-on-surface-variant",
          )}
        />
      </div>
    </div>
  );
}
