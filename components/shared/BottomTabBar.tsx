"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils/cn";
import { DASHBOARD_NAV } from "@/constants/nav";

const BOTTOM_ITEMS = DASHBOARD_NAV.filter((n) => n.showInBottomBar).slice(0, 4);

export function BottomTabBar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-outline-variant/40 bg-[#020617]/90 pb-safe backdrop-blur-2xl md:hidden print:hidden"
      aria-label="모바일 내비게이션"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5">
        {BOTTOM_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href as never}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-label-sm",
                  active ? "text-primary-electric" : "text-on-surface-variant",
                )}
              >
                <item.icon className="h-5 w-5" aria-hidden />
                <span>{(() => { try { return t(item.key); } catch { return item.label; } })()}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            href={"/menu" as never}
            className="flex min-h-14 flex-col items-center justify-center gap-1 py-2 text-label-sm text-on-surface-variant"
          >
            <Menu className="h-5 w-5" aria-hidden />
            <span>더보기</span>
          </Link>
        </li>
      </ul>
    </nav>
  );
}
