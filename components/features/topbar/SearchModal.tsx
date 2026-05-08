"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Search as SearchIcon,
  X,
  LayoutDashboard,
  Users,
  Clock,
  Wallet,
  CalendarCheck,
  Receipt,
  Handshake,
  Package,
  ClipboardCheck,
  FileSignature,
  ShieldAlert,
  TrendingUp,
  PiggyBank,
  Calendar,
  Sparkles,
  Plus,
  type LucideIcon,
} from "lucide-react";
import { globalSearchAction, type SearchHit } from "@/lib/search/actions";
import { cn } from "@/lib/utils/cn";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

type Props = {
  open: boolean;
  onClose: () => void;
};

type CommandItem = {
  id: string;
  label: string;
  hint?: string;
  icon: LucideIcon;
  href?: string;
  onSelect?: () => void;
  group: "page" | "action";
};

const COMMANDS: CommandItem[] = [
  // Pages (역할별 필터링은 RBAC 가드가 처리)
  { id: "p-dashboard", label: "대시보드", icon: LayoutDashboard, href: "/dashboard", group: "page" },
  { id: "p-employees", label: "직원정보", icon: Users, href: "/employees", group: "page" },
  { id: "p-attendance", label: "근태입력", icon: Clock, href: "/attendance", group: "page" },
  { id: "p-payroll", label: "급여계산", icon: Wallet, href: "/payroll", group: "page" },
  { id: "p-leave", label: "연차관리", icon: CalendarCheck, href: "/leave", group: "page" },
  { id: "p-expenses", label: "지출입력", icon: Receipt, href: "/expenses", group: "page" },
  { id: "p-vendors", label: "거래처", icon: Handshake, href: "/vendors", group: "page" },
  { id: "p-assets", label: "자산관리", icon: Package, href: "/assets", group: "page" },
  { id: "p-closing", label: "월말결산", icon: ClipboardCheck, href: "/closing", group: "page" },
  { id: "p-approvals", label: "전자결재", icon: FileSignature, href: "/approvals", group: "page" },
  { id: "p-risks", label: "법적 리스크", icon: ShieldAlert, href: "/risks", group: "page" },
  { id: "p-simulator", label: "인건비 시뮬", icon: TrendingUp, href: "/simulator", group: "page" },
  { id: "p-retirement", label: "퇴직급여", icon: PiggyBank, href: "/retirement", group: "page" },
  { id: "p-year-end", label: "연말정산", icon: Calendar, href: "/year-end", group: "page" },
  { id: "p-calendar", label: "세무 캘린더", icon: Calendar, href: "/calendar", group: "page" },
  { id: "p-recruiting", label: "AI 채용공고", icon: Sparkles, href: "/recruiting", group: "page" },

  // Actions
  { id: "a-new-employee", label: "신규 직원 등록", hint: "새 직원 추가", icon: Plus, href: "/employees/new", group: "action" },
  { id: "a-new-expense", label: "지출 등록 (영수증 OCR)", hint: "AI 영수증 인식", icon: Plus, href: "/expenses/new", group: "action" },
  { id: "a-new-vendor", label: "거래처 등록 (명함 OCR)", hint: "AI 명함 인식", icon: Plus, href: "/vendors/new", group: "action" },
  { id: "a-new-asset", label: "자산 등록", icon: Plus, href: "/assets/new", group: "action" },
  { id: "a-new-leave", label: "휴가 신청", icon: Plus, href: "/leave/new", group: "action" },
  { id: "a-new-attendance", label: "근태 입력", icon: Plus, href: "/attendance/new", group: "action" },
  { id: "a-new-approval", label: "결재 발의", icon: Plus, href: "/approvals/new", group: "action" },
];

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
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  useBodyScrollLock(open);
  const router = useRouter();

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  // 명령어 필터링 (검색어 fuzzy 매칭)
  const q = query.trim().toLowerCase();
  const filteredCommands = q
    ? COMMANDS.filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.hint?.toLowerCase().includes(q),
      )
    : COMMANDS;
  const allItems: Array<{ kind: "cmd"; cmd: CommandItem } | { kind: "hit"; hit: SearchHit }> = [
    ...filteredCommands.map((c) => ({ kind: "cmd" as const, cmd: c })),
    ...hits.map((h) => ({ kind: "hit" as const, hit: h })),
  ];

  // 데이터 검색 (2자 이상)
  useEffect(() => {
    if (!open) return;
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const handle = setTimeout(() => {
      startTransition(async () => {
        const results = await globalSearchAction(q);
        setHits(results);
      });
    }, 220);
    return () => clearTimeout(handle);
  }, [q, open]);

  // 키보드 네비게이션
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) => Math.min(allItems.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = allItems[activeIdx];
        if (!item) return;
        if (item.kind === "cmd") {
          const c = item.cmd;
          if (c.href) navigate(c.href);
          else c.onSelect?.();
        } else {
          navigate(item.hit.href);
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose, allItems, activeIdx]);

  if (!open) return null;

  function navigate(href: string) {
    onClose();
    router.push(href as never);
  }

  let runningIdx = -1;
  const cmdGroups = {
    page: filteredCommands.filter((c) => c.group === "page"),
    action: filteredCommands.filter((c) => c.group === "action"),
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="명령 팔레트"
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
            placeholder="페이지로 이동, 액션 실행, 데이터 검색…"
            className="flex-1 bg-transparent text-body-md text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
          />
          {pending ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin text-on-surface-variant" />
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
          {/* Pages 그룹 */}
          {cmdGroups.page.length > 0 && (
            <div className="border-b border-outline-variant/20 py-1">
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                페이지
              </p>
              {cmdGroups.page.map((c) => {
                runningIdx++;
                const idx = runningIdx;
                return (
                  <CommandRow
                    key={c.id}
                    command={c}
                    active={idx === activeIdx}
                    onClick={() => c.href && navigate(c.href)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  />
                );
              })}
            </div>
          )}

          {/* Actions 그룹 */}
          {cmdGroups.action.length > 0 && (
            <div className="border-b border-outline-variant/20 py-1">
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                액션
              </p>
              {cmdGroups.action.map((c) => {
                runningIdx++;
                const idx = runningIdx;
                return (
                  <CommandRow
                    key={c.id}
                    command={c}
                    active={idx === activeIdx}
                    onClick={() => c.href && navigate(c.href)}
                    onMouseEnter={() => setActiveIdx(idx)}
                  />
                );
              })}
            </div>
          )}

          {/* 데이터 검색 */}
          {hits.length > 0 && (
            <div className="py-1">
              <p className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
                검색 결과
              </p>
              <ul>
                {hits.map((h) => {
                  runningIdx++;
                  const idx = runningIdx;
                  return (
                    <li key={h.id}>
                      <button
                        type="button"
                        onClick={() => navigate(h.href)}
                        onMouseEnter={() => setActiveIdx(idx)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
                          idx === activeIdx
                            ? "bg-primary-electric/10"
                            : "hover:bg-surface-container-high",
                        )}
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
                  );
                })}
              </ul>
            </div>
          )}

          {q.length >= 2 && hits.length === 0 && !pending && filteredCommands.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-on-surface-variant">
              결과 없음
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-outline-variant/30 bg-surface-container-low px-4 py-2 text-label-sm text-on-surface-variant">
          <span>
            <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono text-[10px]">↑↓</kbd>{" "}
            이동{" "}
            <kbd className="ml-2 rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>{" "}
            선택{" "}
            <kbd className="ml-2 rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono text-[10px]">Esc</kbd>{" "}
            닫기
          </span>
          <span>
            <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono text-[10px]">Ctrl</kbd>{" "}
            <kbd className="rounded border border-outline-variant/40 bg-surface-container px-1.5 py-0.5 font-mono text-[10px]">K</kbd>
          </span>
        </div>
      </div>
    </div>
  );
}

function CommandRow({
  command,
  active,
  onClick,
  onMouseEnter,
}: {
  command: CommandItem;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}) {
  const Icon = command.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-2 text-left transition-colors",
        active ? "bg-primary-electric/10" : "hover:bg-surface-container-high",
      )}
    >
      <Icon aria-hidden className="h-4 w-4 text-on-surface-variant" />
      <span className="flex-1 text-body-md text-on-surface">
        {command.label}
      </span>
      {command.hint ? (
        <span className="text-label-sm text-on-surface-variant/60">
          {command.hint}
        </span>
      ) : null}
    </button>
  );
}
