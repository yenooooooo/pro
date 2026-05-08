"use client";

import { useEffect, useState } from "react";
import { Sparkles, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

/**
 * 첫 방문자를 위한 시나리오 기반 사이트 투어.
 *
 * - localStorage 'tour-seen' 으로 1회만 노출
 * - 5단계: 환영 → AI → 리스크 → 시뮬레이터 → 결산
 * - skip / 다시보지않기 / 다음 단계 / 모두 보기 (대시보드)
 *
 * 외부 라이브러리(Driver.js 등) 없이 자체 구현 — 번들 절약
 */
const STEPS = [
  {
    title: "Welcome to Nexus ERP",
    body: "엑셀 10개로 흩어진 총무 업무를 하나로 묶은 미니 ERP 입니다. 7단계 안내로 핵심 차별점을 둘러보세요. (언제든 우상단 ? 아이콘에서 다시 볼 수 있어요)",
    cta: null,
  },
  {
    title: "✨ Ask Nexus — 자연어 질의",
    body: "상단바 별 아이콘(Ctrl+J)을 누르면 \"개발팀 평균 기본급은?\" 같은 자연어 질문에 답해줍니다. Gemini 스트리밍으로 답변이 한 글자씩 나타나며, 같은 질문은 5분 캐싱.",
    cta: { label: "Ask Nexus 열기", href: null, hint: "Ctrl+J 또는 상단 ✨ 아이콘" },
  },
  {
    title: "📸 영수증 사진 한 장 → 지출 등록",
    body: "지출 등록 폼에서 영수증 사진만 업로드하면 일자/금액/VAT/거래처가 자동 입력됩니다. Gemini Vision 우선, 실패 시 Tesseract 자동 fallback.",
    cta: { label: "지출 등록 열기", href: "/expenses/new", hint: null },
  },
  {
    title: "⚖️ 법적 리스크 자동 점검",
    body: "근로기준법 §53 (주 52h), 최저임금, 연차 촉진, 4대보험 신고일까지 자동 모니터링. 한국 노무 현실에 특화.",
    cta: { label: "리스크 대시보드", href: "/risks", hint: null },
  },
  {
    title: "💰 인건비 시뮬레이터",
    body: "채용·일괄 인상·최저임금 변동 시 월간/연간 비용 임팩트를 슬라이더 한 번으로 계산. 경영진 의사결정 직전 도구.",
    cta: { label: "시뮬레이터", href: "/simulator", hint: null },
  },
  {
    title: "👑 임원 대시보드 — 재무 한눈에",
    body: "유동비율·부채비율·당좌비율·영업이익률 + 부서별 인건비 ROI + AI 현금흐름 예측까지. 회계 분개도 자동 (급여 확정 → 차변/대변).",
    cta: { label: "임원 대시보드", href: "/executive", hint: null },
  },
  {
    title: "🌐 i18n + ⌨️ 단축키 + 📱 반응형",
    body: "우상단 EN 토글로 영어 즉시 전환. Ctrl+K(검색) / Ctrl+J(AI) / 모바일에서는 하단 탭바 자동 노출. 전체 28개 페이지 모바일 대응.",
    cta: { label: "도움말에서 전체 보기", href: null, hint: "우상단 ? 아이콘" },
  },
];

export function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  useBodyScrollLock(show);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = localStorage.getItem("tour-seen");
    if (!seen) {
      // 약간 지연 후 노출 (페이지 로드 직후 방해 방지)
      const t = setTimeout(() => setShow(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function close(remember: boolean) {
    if (remember) localStorage.setItem("tour-seen", "1");
    setShow(false);
  }

  if (!show) return null;
  const current = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-primary-electric/30 bg-surface-container shadow-2xl">
        <div className="absolute right-3 top-3">
          <button
            type="button"
            onClick={() => close(true)}
            aria-label="닫기"
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        {/* progress dots */}
        <div className="flex justify-center gap-1.5 pt-5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step
                  ? "w-6 bg-primary-electric"
                  : i < step
                    ? "w-1.5 bg-primary-electric/50"
                    : "w-1.5 bg-surface-container-high")
              }
            />
          ))}
        </div>

        <div className="p-6 pt-3">
          <div className="mb-2 inline-flex items-center gap-1 rounded bg-primary-electric/10 px-2 py-0.5 text-label-sm text-primary-electric">
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
            Step {step + 1} of {STEPS.length}
          </div>
          <h2 className="text-headline-md font-semibold text-on-surface">
            {current.title}
          </h2>
          <p className="mt-2 text-body-md text-on-surface-variant">
            {current.body}
          </p>

          {current.cta?.hint ? (
            <p className="mt-3 inline-block rounded border border-outline-variant/30 bg-surface-container-low px-2 py-1 text-label-sm text-on-surface-variant">
              💡 {current.cta.hint}
            </p>
          ) : null}

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => close(true)}
              className="text-label-sm text-on-surface-variant hover:text-on-surface"
            >
              건너뛰기
            </button>
            <div className="flex items-center gap-2">
              {current.cta?.href ? (
                <Link
                  href={current.cta.href as never}
                  onClick={() => close(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 py-1.5 text-label-sm text-on-surface transition-colors hover:bg-surface-container-high"
                >
                  {current.cta.label} →
                </Link>
              ) : null}
              {last ? (
                <button
                  type="button"
                  onClick={() => close(true)}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  시작하기
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                  className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-gradient-to-b from-primary-electric to-primary-container px-3 py-1.5 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
                >
                  다음
                  <ArrowRight aria-hidden className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
