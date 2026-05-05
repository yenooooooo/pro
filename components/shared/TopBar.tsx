"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Bell, HelpCircle, LogOut, Search, Settings, Sparkles } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { SearchModal } from "@/components/features/topbar/SearchModal";
import { NotificationsPanel } from "@/components/features/topbar/NotificationsPanel";
import { HelpModal } from "@/components/features/topbar/HelpModal";
import { AskNexusModal } from "@/components/features/topbar/AskNexusModal";
import type { NotificationItem } from "@/lib/notifications/server";
import { cn } from "@/lib/utils/cn";

type TopBarProps = {
  userEmail: string | null;
  notifications: NotificationItem[];
};

export function TopBar({ userEmail, notifications }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const bellWrapRef = useRef<HTMLDivElement>(null);

  // Cmd/Ctrl + K → 검색, Cmd/Ctrl + J → Ask Nexus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAskOpen(true);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // 사용자 메뉴 외부 클릭 닫기
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // 알림 패널 외부 클릭 닫기
  useEffect(() => {
    if (!bellOpen) return;
    function onDocMouseDown(e: MouseEvent) {
      if (bellWrapRef.current && !bellWrapRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setBellOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [bellOpen]);

  const notifCount = notifications.length;

  return (
    <>
      <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/50 bg-slate-950/80 px-4 shadow-2xl backdrop-blur-md md:px-8 print:hidden">
        <div className="flex items-center">
          <span className="text-lg font-bold uppercase tracking-tight text-white">
            Nexus ERP
          </span>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-1 md:gap-2">
            {/* Ask Nexus (AI) */}
            <button
              type="button"
              aria-label="Ask Nexus (Ctrl+J)"
              onClick={() => setAskOpen(true)}
              className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-primary-electric transition-all duration-200 hover:bg-primary-electric/10 active:scale-95"
              title="Ask Nexus — AI 자연어 질의 (Ctrl+J)"
            >
              <Sparkles className="h-5 w-5" />
            </button>

            {/* 검색 */}
            <button
              type="button"
              aria-label="전역 검색 (Ctrl+K)"
              onClick={() => setSearchOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* 알림 */}
            <div ref={bellWrapRef} className="relative">
              <button
                type="button"
                aria-label="알림"
                aria-haspopup="menu"
                aria-expanded={bellOpen}
                onClick={() => setBellOpen((v) => !v)}
                className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
              >
                <Bell className="h-5 w-5" />
                {notifCount > 0 ? (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute right-1.5 top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none text-white",
                      notifCount >= 5 ? "bg-red-500" : "bg-amber-500",
                    )}
                  >
                    {notifCount > 9 ? "9+" : notifCount}
                  </span>
                ) : null}
              </button>
              {bellOpen ? (
                <NotificationsPanel
                  items={notifications}
                  onNavigate={() => setBellOpen(false)}
                />
              ) : null}
            </div>

            {/* 설정 (링크) */}
            <Link
              href={"/settings" as never}
              aria-label="시스템 설정"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
            >
              <Settings className="h-5 w-5" />
            </Link>

            {/* 도움말 */}
            <button
              type="button"
              aria-label="도움말"
              onClick={() => setHelpOpen(true)}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
            >
              <HelpCircle className="h-5 w-5" />
            </button>
          </div>

          <div aria-hidden className="hidden h-6 w-px bg-slate-800/50 md:block" />

          <button
            type="button"
            onClick={() => setHelpOpen(true)}
            className="hidden text-label-sm font-semibold uppercase tracking-widest text-primary-electric transition-colors hover:text-primary-container md:inline-flex"
          >
            Help Center
          </button>

          <div ref={wrapperRef} className="relative">
            <button
              type="button"
              aria-label="사용자 메뉴"
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-surface-container-highest bg-gradient-to-br from-primary-electric/40 to-primary-container/40 transition-all hover:border-primary-electric focus:outline-none focus:ring-2 focus:ring-primary-electric"
            />
            {open ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container shadow-2xl"
              >
                <div className="border-b border-outline-variant/30 px-4 py-3">
                  <p className="text-label-sm text-on-surface-variant">로그인 계정</p>
                  <p className="mt-0.5 truncate text-body-md font-medium text-on-surface">
                    {userEmail ?? "—"}
                  </p>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-body-md text-on-surface transition-colors hover:bg-error-soft/10 hover:text-error-soft"
                  >
                    <LogOut aria-hidden className="h-4 w-4" />
                    로그아웃
                  </button>
                </form>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
      <AskNexusModal open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}
