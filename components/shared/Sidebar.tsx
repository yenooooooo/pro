"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
    "/accounting",
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
    "/accounting",
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

/**
 * v2 디자인 — Editorial 사이드바
 *
 * 240px 고정, 다크 배경, gold accent 좌측 1px border (active),
 * M01~M16 mono prefix, 섹션 그룹화 (Operations / Records / Cycle / System).
 */

// 섹션 그룹화 — v2 App.html 구조 그대로
type SectionDef = {
  title: string;
  items: string[]; // href list
};

const SECTIONS: SectionDef[] = [
  {
    title: "Operations",
    items: [
      "/dashboard",
      "/executive",
      "/payroll",
      "/approvals",
      "/risks",
      "/simulator",
      "/activity",
    ],
  },
  {
    title: "Records",
    items: [
      "/employees",
      "/attendance",
      "/leave",
      "/expenses",
      "/vendors",
      "/assets",
      "/contracts",
      "/business-trips",
      "/revenue",
    ],
  },
  {
    title: "Cycle",
    items: [
      "/closing",
      "/accounting",
      "/retirement",
      "/year-end",
      "/calendar",
      "/recruiting",
    ],
  },
  {
    title: "System",
    items: ["/audit-logs", "/settings"],
  },
];

type Props = {
  role?: Role;
  bookmarks?: BookmarkItem[];
};

export function Sidebar({ role, bookmarks = [] }: Props = {}) {
  const pathname = usePathname();
  const [reportOpen, setReportOpen] = useState(false);
  const t = useTranslations("nav");
  const navByHref = new Map(DASHBOARD_NAV.map((n) => [n.href, n]));

  // M01, M02, M03… 번호 매김 (전체 페이지 순서대로)
  const indexByHref = new Map<string, number>();
  let idx = 1;
  for (const section of SECTIONS) {
    for (const href of section.items) {
      if (navByHref.has(href)) {
        indexByHref.set(href, idx);
        idx += 1;
      }
    }
  }

  return (
    <>
      <aside
        className="fixed left-0 top-0 z-40 hidden h-screen w-60 flex-col border-r border-line bg-bg md:flex print:hidden"
        aria-label="사이드바"
      >
        {/* 브랜드 */}
        <div className="flex items-center gap-[10px] border-b border-line px-5 py-[22px] font-mono text-[12px] tracking-[0.15em]">
          <span className="brand-mark" />
          <span className="text-text-1">NEXUS</span>
          <em className="ml-auto text-[10px] not-italic text-text-3">v2.0</em>
        </div>

        {/* Ask Nexus 검색 버튼 */}
        <button
          type="button"
          onClick={() => {
            // Ctrl+J 핸들러가 TopBar 에 있음 — 트리거
            document.dispatchEvent(
              new KeyboardEvent("keydown", { key: "j", ctrlKey: true }),
            );
          }}
          className="mx-[14px] mb-[6px] mt-[14px] flex items-center gap-[10px] border border-line bg-bg-1 px-3 py-[10px] font-mono text-[11px] text-text-3 transition-colors hover:border-gold hover:text-text-2"
        >
          <span className="text-gold">✦</span>
          <span>Ask Nexus…</span>
          <span className="ml-auto border border-line-2 px-[6px] py-[2px] text-[10px]">
            ⌃J
          </span>
        </button>

        {/* 섹션별 네비게이션 */}
        <nav className="flex flex-1 flex-col gap-px overflow-y-auto px-2 py-2">
          {SECTIONS.map((section) => {
            const visibleItems = section.items
              .filter((href) => navByHref.has(href))
              .filter((href) => canSee(role, href));
            if (visibleItems.length === 0) return null;

            return (
              <div key={section.title}>
                <div className="px-5 pb-[6px] pt-[18px] font-mono text-[9px] uppercase tracking-[0.16em] text-text-4">
                  {section.title}
                </div>
                {visibleItems.map((href) => {
                  const item = navByHref.get(href)!;
                  const active =
                    pathname === href || pathname.startsWith(`${href}/`);
                  const num = indexByHref.get(href);
                  let label: string;
                  try {
                    label = t(item.key);
                  } catch {
                    label = item.label;
                  }
                  return (
                    <Link
                      key={href}
                      href={href as never}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 border-l border-transparent px-3 py-[9px] text-[13px] transition-all",
                        active
                          ? "border-l-gold bg-bg-1 text-text-1"
                          : "text-text-2 hover:bg-bg-1 hover:text-text-1",
                      )}
                    >
                      <span
                        className={cn(
                          "w-[22px] font-mono text-[9px] tracking-[0.05em]",
                          active ? "text-gold" : "text-text-4",
                        )}
                      >
                        {num ? `M${String(num).padStart(2, "0")}` : ""}
                      </span>
                      <span className="flex-1 truncate">{label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}

          {/* 즐겨찾기 */}
          {bookmarks.length > 0 && (
            <div>
              <div className="px-5 pb-[6px] pt-[18px] font-mono text-[9px] uppercase tracking-[0.16em] text-text-4">
                Bookmarks
              </div>
              {bookmarks.slice(0, 6).map((b) => (
                <Link
                  key={b.id}
                  href={
                    (b.kind === "employee"
                      ? `/employees/${b.target}`
                      : b.kind === "vendor"
                        ? `/vendors`
                        : b.target) as never
                  }
                  title={b.label}
                  className="flex items-center gap-3 border-l border-transparent px-3 py-[9px] text-[13px] text-text-2 transition-all hover:bg-bg-1 hover:text-text-1"
                >
                  <span className="w-[22px] font-mono text-[9px] text-text-4">
                    ★
                  </span>
                  <span className="flex-1 truncate">{b.label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* 하단 리포트 생성 + 유저 */}
        <div className="border-t border-line">
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex w-full items-center justify-center gap-2 border-b border-line px-4 py-[10px] font-mono text-[11px] uppercase tracking-[0.06em] text-text-2 transition-colors hover:bg-bg-1 hover:text-gold"
          >
            <span>+</span>
            <span>리포트 생성</span>
          </button>
          <div className="flex items-center gap-3 px-4 py-[14px]">
            <div className="flex h-8 w-8 items-center justify-center border border-line-2 bg-bg-2 font-serif text-[16px] italic text-gold">
              N
            </div>
            <div className="text-[12px] leading-[1.3] text-text-1">
              남윤서
              <small className="block font-mono text-[10px] tracking-[0.05em] text-text-3">
                admin · 총무
              </small>
            </div>
          </div>
        </div>
      </aside>
      <ReportBuilderModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </>
  );
}
