"use client";

import { useEffect } from "react";

/**
 * 모달/패널이 열릴 때 body 스크롤을 잠근다.
 *
 * - 현재 scroll 위치 보존 (closing 후 복원)
 * - 스크롤바 자리 padding-right 보정 — 레이아웃 점프 방지
 * - 여러 모달이 동시에 열려도 안전 (counter 기반)
 *
 * 사용:
 *   useBodyScrollLock(open);
 */

let lockCount = 0;
let savedScrollY = 0;
let savedPaddingRight = "";
let savedOverflow = "";

export function useBodyScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    if (typeof document === "undefined") return;

    const body = document.body;
    if (lockCount === 0) {
      // 첫 잠금 — 현재 상태 저장 + 적용
      savedScrollY = window.scrollY;
      savedPaddingRight = body.style.paddingRight;
      savedOverflow = body.style.overflow;

      // 스크롤바 너비 계산 → padding 보정 (레이아웃 점프 방지)
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
      body.style.overflow = "hidden";
    }
    lockCount += 1;

    return () => {
      lockCount -= 1;
      if (lockCount === 0) {
        body.style.paddingRight = savedPaddingRight;
        body.style.overflow = savedOverflow;
        // 스크롤 위치 복원 (이전 상태 그대로)
        window.scrollTo(0, savedScrollY);
      }
    };
  }, [active]);
}
