"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
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
      className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/[0.78] px-6 pt-24 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[720px] border border-line-2 bg-bg-1 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-modal-in"
      >
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
            <b>·</b>Search · Cmd+K
          </div>
          <h2 className="mt-2 font-serif text-[28px] italic text-text-1">
            Global <em className="text-gold">Search.</em>
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Navigate · Actions · Data
          </p>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-line bg-bg px-6 py-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-text-3">
            ›
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="페이지로 이동, 액션 실행, 데이터 검색…"
            className="flex-1 bg-transparent font-mono text-[13px] text-text-1 placeholder:text-text-4 focus:outline-none"
          />
          {pending ? (
            <span className="animate-pulse font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
              ▌
            </span>
          ) : null}
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {/* Pages 그룹 */}
          {cmdGroups.page.length > 0 && (
            <div className="border-b border-line">
              <p className="px-6 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
                <span className="mr-3 text-gold">·</span>Pages
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
            <div className="border-b border-line">
              <p className="px-6 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
                <span className="mr-3 text-gold">·</span>Actions
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
            <div>
              <p className="px-6 py-2 font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
                <span className="mr-3 text-gold">·</span>Results
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
                          "flex w-full items-center gap-3 border-b border-line px-6 py-3 text-left transition-colors",
                          idx === activeIdx
                            ? "bg-gold/[0.06]"
                            : "hover:bg-bg-2",
                        )}
                      >
                        <span className="chip">{TYPE_LABEL[h.type]}</span>
                        <span className="flex-1 truncate">
                          <span className="block truncate font-serif text-[15px] italic text-text-1">
                            {h.title}
                          </span>
                          {h.subtitle ? (
                            <span className="block truncate font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                              {h.subtitle}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
                          Enter ↵
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {q.length >= 2 && hits.length === 0 && !pending && filteredCommands.length === 0 && (
            <div className="px-6 py-10 text-center font-serif text-[18px] italic text-text-3">
              결과 없음.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-line bg-bg px-6 py-3 font-mono text-[10px] uppercase tracking-[0.1em] text-text-3">
          <span className="flex items-center gap-3">
            <span>
              <kbd className="border border-line bg-bg-1 px-1.5 py-0.5 text-text-2">↑↓</kbd>{" "}
              Move
            </span>
            <span>
              <kbd className="border border-line bg-bg-1 px-1.5 py-0.5 text-text-2">Enter</kbd>{" "}
              Select
            </span>
            <span>
              <kbd className="border border-line bg-bg-1 px-1.5 py-0.5 text-text-2">Esc</kbd>{" "}
              Close
            </span>
          </span>
          <span>
            <kbd className="border border-line bg-bg-1 px-1.5 py-0.5 text-text-2">Ctrl</kbd>{" "}
            <kbd className="border border-line bg-bg-1 px-1.5 py-0.5 text-text-2">K</kbd>
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
        "flex w-full items-center gap-3 px-6 py-2.5 text-left transition-colors",
        active ? "bg-gold/[0.06]" : "hover:bg-bg-2",
      )}
    >
      <Icon aria-hidden className={cn("h-4 w-4", active ? "text-gold" : "text-text-3")} />
      <span className="flex-1 text-[14px] text-text-1">{command.label}</span>
      {command.hint ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
          {command.hint}
        </span>
      ) : null}
      {active ? (
        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
          ↵
        </span>
      ) : null}
    </button>
  );
}
