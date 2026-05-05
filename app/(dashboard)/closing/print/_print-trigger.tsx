"use client";

import { useEffect } from "react";

/**
 * 페이지 마운트 후 잠시 기다렸다가 자동으로 인쇄 다이얼로그를 띄움.
 * 사용자가 그대로 PDF 저장 또는 취소 가능.
 */
export function PrintTrigger() {
  useEffect(() => {
    const handle = setTimeout(() => {
      try {
        window.print();
      } catch {
        /* 일부 브라우저 차단 시 무시 — 사용자가 Ctrl+P 로 직접 호출 */
      }
    }, 600);
    return () => clearTimeout(handle);
  }, []);
  return null;
}
