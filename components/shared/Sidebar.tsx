"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { FileSearch, Plus, Settings, Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { DASHBOARD_NAV } from "@/constants/nav";
import { ReportBuilderModal } from "@/components/features/reports/ReportBuilderModal";

export type BookmarkItem = {
  id: string;
  kind: "page" | "employee" | "vendor";
  target: string;
  label: string;
};

type Role = "admin" | "hr" | "finance" | "employee";

const ROLE_NAV_ACCESS: Record<Role, string[]> = {
  admin: ["*"],
  hr: [
    "/dashboard",
    "/employees",
    "/attendance",
    "/leave",
    "/year-end",
    "/risks",
    "/simulator",
    "/retirement",
    "/approvals",
    "/calendar",
    "/recruiting",
    "/activity",
    "/contracts",
    "/business-trips",
    "/revenue",
    "/executive",
  ],
  finance: [
    "/dashboard",
    "/payroll",
    "/expenses",
    "/vendors",
    "/assets",
    "/closing",
    "/risks",
    "/simulator",
    "/retirement",
    "/approvals",
    "/calendar",
    "/recruiting",
    "/activity",
    "/contracts",
    "/business-trips",
    "/revenue",
    "/executive",
  ],
  employee: ["/dashboard", "/leave", "/payroll", "/approvals"],
};

function canSee(role: Role | undefined, href: string): boolean {
  if (!role) return true;
  const allowed = ROLE_NAV_ACCESS[role];
  if (!allowed) return true;
  if (allowed.includes("*")) return true;
  return allowed.some((p) => href === p || href.startsWith(`${p}/`));
}

type Props = {
  role?: Role;
  bookmarks?: BookmarkItem[];
};

export function Sidebar({ role, bookmarks = [] }: Props = {}) {
  const pathname = usePathname();
  const [reportOpen, setReportOpen] = useState(false);
  const t = useTranslations("nav");
  const visibleNav = DASHBOARD_NAV.filter((item) => canSee(role, item.href));

  return (
    <>
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-slate-800/40 bg-[#020617]/80 shadow-[4px_0_24px_rgba(0,0,0,0.5)] backdrop-blur-2xl md:flex print:hidden",
        "w-16 lg:w-72",
      )}
      aria-label="사이드바"
    >
      {/* 로고 + 브랜드 */}
      <div className="flex items-center gap-4 px-4 py-6 lg:px-6">
        <div
          className="h-10 w-10 flex-shrink-0 rounded-lg border border-outline-variant bg-gradient-to-br from-primary-electric to-primary-container"
          aria-hidden
        />
        <div className="hidden lg:block">
          <h1 className="text-headline-md font-semibold tracking-tight text-white">
            Nexus ERP
          </h1>
          <p className="mt-1 text-label-sm uppercase tracking-widest text-on-surface-variant">
            Enterprise Edition
          </p>
        </div>
      </div>

      {/* 메인 네비게이션 — 역할별 필터링 */}
      <nav className="flex-1 space-y-2 overflow-y-auto px-2 py-2 lg:px-4">
        {visibleNav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          // i18n 라벨 — 키 없으면 폴백 한국어
          let label: string;
          try {
            label = t(item.key);
          } catch {
            label = item.label;
          }
          return (
            <Link
              key={item.href}
              href={item.href as never}
              title={label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-4 rounded-lg px-3 py-2.5 text-body-md transition-all duration-300 ease-out lg:px-4 lg:py-3",
                active
                  ? "border-r-2 border-primary-electric bg-primary-electric/10 text-primary-electric shadow-[0_0_15px_rgba(192,193,255,0.1)]"
                  : "text-slate-500 hover:bg-slate-800/20 hover:pl-3 hover:text-slate-200 lg:hover:pl-5",
              )}
            >
              <item.icon className="h-5 w-5 flex-shrink-0" aria-hidden />
              <span className="hidden font-medium lg:inline">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* 하단: 리포트 생성 + 시스템 */}
      <div className="mt-auto px-3 pb-4 lg:px-6">
        <button
          type="button"
          onClick={() => setReportOpen(true)}
          aria-label="리포트 생성"
          className="mb-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-2.5 text-body-md font-semibold text-on-primary transition-opacity hover:opacity-90 lg:mb-6 lg:px-4 lg:py-3"
        >
          <Plus className="h-5 w-5 flex-shrink-0" aria-hidden />
          <span className="hidden lg:inline">리포트 생성</span>
        </button>

        <div className="space-y-1 border-t border-slate-800/30 pt-4">
          <Link
            href={"/settings" as never}
            title="시스템 설정"
            className="flex min-h-11 items-center gap-4 rounded-lg px-2 py-2 text-sm text-slate-500 transition-colors hover:text-slate-200"
          >
            <Settings className="h-5 w-5 flex-shrink-0" aria-hidden />
            <span className="hidden lg:inline">시스템 설정</span>
          </Link>
          <Link
            href={"/audit-logs" as never}
            title="감사 로그"
            className="flex min-h-11 items-center gap-4 rounded-lg px-2 py-2 text-sm text-slate-500 transition-colors hover:text-slate-200"
          >
            <FileSearch className="h-5 w-5 flex-shrink-0" aria-hidden />
            <span className="hidden lg:inline">감사 로그</span>
          </Link>
        </div>

        {/* 즐겨찾기 (lg 이상에서만) */}
        {bookmarks.length > 0 && (
          <div className="mt-4 hidden border-t border-slate-800/30 pt-4 lg:block">
            <p className="mb-2 flex items-center gap-1 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
              <Star aria-hidden className="h-3 w-3" />
              즐겨찾기
            </p>
            <ul className="space-y-0.5">
              {bookmarks.slice(0, 6).map((b) => (
                <li key={b.id}>
                  <Link
                    href={
                      (b.kind === "employee"
                        ? `/employees/${b.target}`
                        : b.kind === "vendor"
                          ? `/vendors`
                          : b.target) as never
                    }
                    title={b.label}
                    className="flex min-h-9 items-center gap-2 rounded px-2 py-1 text-label-sm text-slate-500 transition-colors hover:bg-slate-800/20 hover:text-slate-200"
                  >
                    <span className="truncate">{b.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </aside>
    <ReportBuilderModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}

