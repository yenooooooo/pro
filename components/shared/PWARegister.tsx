"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

/**
 * PWA service worker 등록 + "홈 화면에 추가" 프롬프트 토스트.
 *
 * - production 에서만 SW 등록 (dev 에서는 cache 간섭 방지)
 * - beforeinstallprompt 캡처 → 사용자에게 안내
 * - 7일간 dismiss 기억
 */
export function PWARegister() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // SW 등록 — production 에서만
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[pwa] SW 등록 실패:", err);
        });
    }

    // 설치 프롬프트 캡처
    const dismissedAt = Number(localStorage.getItem("pwa-install-dismiss") ?? 0);
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - dismissedAt < sevenDays) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem("pwa-install-dismiss", String(Date.now()));
  }

  async function install() {
    if (!installEvent) return;
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted" || outcome === "dismissed") {
      setShow(false);
      setInstallEvent(null);
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-20 right-4 z-[55] max-w-sm rounded-xl border border-primary-electric/30 bg-surface-container p-4 shadow-2xl backdrop-blur-md md:bottom-4">
      <div className="flex items-start gap-3">
        <Download
          aria-hidden
          className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-electric"
        />
        <div className="flex-1">
          <p className="text-body-md font-semibold text-on-surface">
            앱으로 설치
          </p>
          <p className="mt-1 text-label-sm text-on-surface-variant">
            홈 화면에 추가하면 브라우저 없이도 빠르게 접근하고, 푸시 알림을 받을 수
            있습니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={install}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
            >
              설치
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="inline-flex min-h-9 items-center rounded-lg px-3 py-1.5 text-label-sm text-on-surface-variant transition-colors hover:bg-surface-container-high"
            >
              나중에
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="닫기"
          className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
        >
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
