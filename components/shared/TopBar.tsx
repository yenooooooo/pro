"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, HelpCircle, LogOut, Search, Settings } from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";

type TopBarProps = { userEmail: string | null };

export function TopBar({ userEmail }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

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

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/50 bg-slate-950/80 px-4 shadow-2xl backdrop-blur-md md:px-8">
      <div className="flex items-center">
        <span className="text-lg font-bold uppercase tracking-tight text-white">
          Chongmu PRO Elite
        </span>
      </div>

      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-1 md:gap-2">
          <button
            type="button"
            aria-label="전역 검색"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
          >
            <Search className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="알림"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
          >
            <Bell className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="설정"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
          >
            <Settings className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="도움말"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full p-2 text-slate-400 transition-all duration-200 hover:bg-slate-800/40 hover:text-slate-100 active:scale-95"
          >
            <HelpCircle className="h-5 w-5" />
          </button>
        </div>

        <div aria-hidden className="hidden h-6 w-px bg-slate-800/50 md:block" />

        <button
          type="button"
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
  );
}
