"use client";

import { Bell, HelpCircle, Search, Settings } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-800/50 bg-slate-950/80 px-4 shadow-2xl backdrop-blur-md md:px-8">
      {/* 좌: 브랜드 (사이드바가 아이콘만일 때 식별성 보강 / lg 이상에서는 중복이지만 stitch 디자인 유지) */}
      <div className="flex items-center">
        <span className="text-lg font-bold uppercase tracking-tight text-white">
          Chongmu PRO Elite
        </span>
      </div>

      {/* 우: 아이콘 + Help Center + 아바타 */}
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

        {/* 유저 아바타 — Phase 2에서 실제 이미지 교체 */}
        <div
          aria-hidden
          className="h-8 w-8 flex-shrink-0 cursor-pointer rounded-full border-2 border-surface-container-highest bg-gradient-to-br from-primary-electric/40 to-primary-container/40"
        />
      </div>
    </header>
  );
}
