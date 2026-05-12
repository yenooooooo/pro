"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { logoutAction } from "@/lib/auth/actions";
import { SearchModal } from "@/components/features/topbar/SearchModal";
import { NotificationsPanel } from "@/components/features/topbar/NotificationsPanel";
import { HelpModal } from "@/components/features/topbar/HelpModal";
import { AskNexusModal } from "@/components/features/topbar/AskNexusModal";
import { PresenceMount } from "@/components/shared/PresenceMount";
import { LocaleToggle } from "@/components/shared/LocaleToggle";
import { SystemPulseButton } from "@/components/shared/PulseSweep";
import type { NotificationItem } from "@/lib/notifications/server";
import { DASHBOARD_NAV } from "@/constants/nav";

type TopBarProps = {
  userEmail: string | null;
  notifications: NotificationItem[];
  userRole?: string | null;
};

/**
 * v2 디자인 TopBar
 *
 * - 56px 높이
 * - Breadcrumb: NEXUS / Operations / [현재 페이지]
 * - 우측: Presence avatars + Ask Nexus button (gold) + 알림/설정/도움말 icon-btn
 */
export function TopBar({ userEmail, notifications, userRole }: TopBarProps) {
  const t = useTranslations("topbar");
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const bellWrapRef = useRef<HTMLDivElement>(null);

  // Ctrl/Cmd + K → 검색, Ctrl/Cmd + J → Ask Nexus
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

  // 사용자 메뉴 외부 클릭
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

  // 알림 패널 외부 클릭
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

  // 현재 페이지 라벨 추출 (breadcrumb 마지막 마디)
  const navT = useTranslations("nav");
  const currentNav = DASHBOARD_NAV.find(
    (n) => pathname === n.href || pathname.startsWith(`${n.href}/`),
  );
  let currentLabel = "대시보드";
  if (currentNav) {
    try {
      currentLabel = navT(currentNav.key);
    } catch {
      currentLabel = currentNav.label;
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 w-full items-center gap-[18px] border-b border-line bg-bg/85 px-7 backdrop-blur-[12px] print:hidden">
        {/* Breadcrumb */}
        <div className="flex items-center gap-[10px] font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
          <span>NEXUS</span>
          <span className="text-text-4">/</span>
          <span>Operations</span>
          <span className="text-text-4">/</span>
          <b className="font-normal text-text-1">{currentLabel}</b>
        </div>

        <div className="ml-auto flex items-center gap-[10px]">
          <PresenceMount userEmail={userEmail} />
          <LocaleToggle />

          {/* Ask Nexus 골드 버튼 */}
          <button
            type="button"
            onClick={() => setAskOpen(true)}
            className="hidden h-[34px] items-center gap-[10px] border border-gold-soft bg-gold/[0.06] px-[14px] font-mono text-[11px] uppercase tracking-[0.08em] text-gold transition-colors hover:bg-gold/[0.12] md:flex"
          >
            <span>✦</span>
            <span>{t("ask_nexus")}</span>
            <kbd className="ml-1 border border-line-2 px-[6px] py-[2px] text-[10px] text-text-3">
              ⌃ J
            </kbd>
          </button>

          {/* System Pulse ⊙ */}
          <SystemPulseButton />

          {/* 검색 (Ctrl+K) */}
          <button
            type="button"
            aria-label={`${t("global_search")} (Ctrl+K)`}
            onClick={() => setSearchOpen(true)}
            className="flex h-[34px] w-[34px] items-center justify-center border border-line text-text-2 transition-colors hover:border-line-2 hover:text-text-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="21" y2="21" />
            </svg>
          </button>

          {/* 알림 */}
          <div ref={bellWrapRef} className="relative">
            <button
              type="button"
              aria-label={t("notifications")}
              aria-haspopup="menu"
              aria-expanded={bellOpen}
              onClick={() => setBellOpen((v) => !v)}
              className="relative flex h-[34px] w-[34px] items-center justify-center border border-line text-text-2 transition-colors hover:border-line-2 hover:text-text-1"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                aria-hidden
              >
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
              </svg>
              {notifCount > 0 ? (
                <span
                  aria-hidden
                  className="absolute right-[6px] top-[6px] h-[6px] w-[6px] rounded-full bg-gold shadow-[0_0_8px_#F5C26B]"
                />
              ) : null}
            </button>
            {bellOpen ? (
              <NotificationsPanel
                items={notifications}
                onNavigate={() => setBellOpen(false)}
              />
            ) : null}
          </div>

          {/* 설정 */}
          <Link
            href={"/settings" as never}
            aria-label={t("settings")}
            className="flex h-[34px] w-[34px] items-center justify-center border border-line text-text-2 transition-colors hover:border-line-2 hover:text-text-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>

          {/* 도움말 */}
          <button
            type="button"
            aria-label={t("help")}
            onClick={() => setHelpOpen(true)}
            className="flex h-[34px] w-[34px] items-center justify-center border border-line text-text-2 transition-colors hover:border-line-2 hover:text-text-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </button>

          {/* 유저 아바타 메뉴 */}
          <div ref={wrapperRef} className="relative">
            <button
              type="button"
              aria-label={t("user_menu")}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="ml-1 flex h-8 w-8 items-center justify-center border border-line-2 bg-bg-2 font-serif text-[14px] italic text-gold transition-colors hover:border-gold"
            >
              {(userEmail?.[0] ?? "N").toUpperCase()}
            </button>
            {open ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-64 overflow-hidden border border-line-2 bg-bg-1 shadow-2xl"
              >
                <div className="border-b border-line px-4 py-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-text-3">
                    {t("login_account")}
                  </p>
                  <p className="mt-1 truncate text-[13px] text-text-1">
                    {userEmail ?? "—"}
                  </p>
                  {userRole ? (
                    <p className="mt-1 inline-flex items-center gap-1 border border-gold-soft px-[6px] py-[2px] font-mono text-[10px] uppercase tracking-[0.06em] text-gold">
                      {userRole}
                    </p>
                  ) : null}
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    role="menuitem"
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-text-2 transition-colors hover:bg-bg-2 hover:text-gold"
                  >
                    {t("logout")}
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
