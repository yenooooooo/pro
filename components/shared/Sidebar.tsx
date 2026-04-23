"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings, FileSearch } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { DASHBOARD_NAV } from "@/constants/nav";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen border-r border-outline-variant/40 shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:flex md:flex-col",
        "w-16 lg:w-72",
        "bg-[#020617]/80 backdrop-blur-2xl",
      )}
      aria-label="사이드바"
    >
      <div className="flex items-center gap-3 px-4 py-6 lg:px-6">
        <div className="h-10 w-10 flex-shrink-0 rounded-lg border border-outline-variant bg-gradient-to-br from-primary-electric to-primary-container" />
        <div className="hidden lg:block">
          <h1 className="text-headline-md font-semibold tracking-tight text-on-surface">
            Chongmu PRO
          </h1>
          <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">
            Enterprise Edition
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4 lg:px-3">
        {DASHBOARD_NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href as never}
              className="nav-link"
              data-active={active}
              title={item.label}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden />
              <span className="hidden text-data-tabular lg:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-outline-variant/40 px-2 py-4 lg:px-3">
        <Link href={"/settings" as never} className="nav-link" title="설정">
          <Settings className="h-5 w-5" aria-hidden />
          <span className="hidden text-data-tabular lg:inline">설정</span>
        </Link>
        <Link href={"/audit-logs" as never} className="nav-link" title="감사 로그">
          <FileSearch className="h-5 w-5" aria-hidden />
          <span className="hidden text-data-tabular lg:inline">감사 로그</span>
        </Link>
      </div>
    </aside>
  );
}
