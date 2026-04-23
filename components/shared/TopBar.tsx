"use client";

import { Bell, HelpCircle, Search, Settings } from "lucide-react";

export function TopBar() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-outline-variant/40 bg-surface/80 px-4 backdrop-blur-xl md:pl-[calc(4rem+1rem)] lg:pl-[calc(18rem+1rem)] lg:pr-8">
      <div className="flex flex-1 items-center gap-3 rounded-lg bg-surface-container-lowest px-3 md:max-w-xl">
        <Search className="h-4 w-4 text-on-surface-variant" aria-hidden />
        <input
          type="search"
          placeholder="직원, 급여, 지출 검색…"
          className="min-h-11 flex-1 bg-transparent text-data-tabular text-on-surface placeholder:text-on-surface-variant focus:outline-none"
        />
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="알림"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          <Bell className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="설정"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          <Settings className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="hidden min-h-11 items-center gap-2 rounded-lg border border-outline-variant px-3 text-data-tabular text-on-surface-variant hover:text-on-surface md:inline-flex"
        >
          <HelpCircle className="h-4 w-4" />
          <span>Help Center</span>
        </button>
      </div>
    </header>
  );
}
