"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useBodyScrollLock } from "@/lib/hooks/use-body-scroll-lock";

type Props = {
  open: boolean;
  onClose: () => void;
};

type LinkItem = {
  label: string;
  desc?: string;
  href: string;
  external?: boolean;
};

type Shortcut = {
  keys: string[];
  desc: string;
};

const PAGE_GUIDE: { category: string; items: LinkItem[] }[] = [
  {
    category: "Dashboard",
    items: [
      { label: "전략 대시보드", desc: "이번달 KPI 4종 + AI 인사이트 + 6개월 추세", href: "/dashboard" },
      { label: "임원 대시보드", desc: "재무비율 + 부서별 ROI + Gemini 현금흐름 예측", href: "/executive" },
      { label: "회계", desc: "분개장 + 시산표 + 재무제표 자동 생성", href: "/accounting" },
    ],
  },
  {
    category: "HR · Attendance",
    items: [
      { label: "직원 정보", desc: "마스터 + 카드뷰 + 부서/직급/근속 통합", href: "/employees" },
      { label: "근태 입력", desc: "일별 근무·연장·야간·휴일 시간 + 주52h 자동 경고", href: "/attendance" },
      { label: "급여 계산", desc: "월별 일괄 계산 — 4대보험·소득세 자동 (근기법 §56)", href: "/payroll" },
      { label: "연차 관리", desc: "발생·잔여·촉진 대상 자동 (근기법 §60)", href: "/leave" },
      { label: "퇴직급여", desc: "DB/DC 추계 — 평균임금 산정", href: "/retirement" },
      { label: "연말정산", desc: "인적공제·결정세액 추정", href: "/year-end" },
    ],
  },
  {
    category: "Finance · Ops",
    items: [
      { label: "지출 입력", desc: "카테고리·거래처·한도 모니터링 + 영수증 OCR", href: "/expenses" },
      { label: "거래처", desc: "공급사·고객사·파트너 통합 관리", href: "/vendors" },
      { label: "자산 관리", desc: "감가상각·내용연수·만료 알림", href: "/assets" },
      { label: "계약서", desc: "거래처 계약 + 만료 임박 알림", href: "/contracts" },
      { label: "매출", desc: "월별·부서별 매출 + ROI 산정", href: "/revenue" },
      { label: "출장 정산", desc: "신청 → 영수증 OCR → 자동 정산", href: "/business-trips" },
    ],
  },
  {
    category: "Closing · Approvals",
    items: [
      { label: "월말결산", desc: "체크리스트 진행률 + 인쇄용 리포트", href: "/closing" },
      { label: "전자결재", desc: "다단계 결재선 + 감사 로그 자동", href: "/approvals" },
      { label: "세무 캘린더", desc: "4대보험·원천세·부가세 마감일 한눈에", href: "/calendar" },
    ],
  },
  {
    category: "AI · Insights",
    items: [
      { label: "AI 채용공고", desc: "Gemini 직무기술서 자동 작성 (마크다운 출력)", href: "/recruiting" },
      { label: "법적 리스크", desc: "근로·세무·계약 리스크 자동 점검", href: "/risks" },
      { label: "인건비 시뮬레이터", desc: "채용·인상률 변동 임팩트", href: "/simulator" },
      { label: "활동 피드", desc: "전사 변경·결재·승인 타임라인", href: "/activity" },
    ],
  },
  {
    category: "Admin",
    items: [
      { label: "시스템 설정", desc: "4대보험 요율 + 결산 체크리스트 + 알림", href: "/settings" },
      { label: "감사 로그", desc: "민감 행위 이력 (수정·삭제 불가)", href: "/audit-logs" },
    ],
  },
];

const AI_FEATURES: LinkItem[] = [
  {
    label: "Ask Nexus — 자연어 질의 (Ctrl+J)",
    desc: "\"개발팀 평균 기본급?\" 같은 질문에 Gemini 스트리밍 답변. 5분 캐싱.",
    href: "#",
  },
  {
    label: "영수증 OCR (지출 등록 폼)",
    desc: "사진 1장 → 일자/금액/VAT/거래처 자동. Gemini Vision + Tesseract fallback.",
    href: "/expenses/new",
  },
  {
    label: "AI 인사이트 (대시보드)",
    desc: "이번달 비용 이상치, 부서별 효율, 추세 분석을 자연어로.",
    href: "/dashboard",
  },
  {
    label: "현금흐름 예측 (임원 대시보드)",
    desc: "12개월 추세를 Gemini가 분석 → 다음 3개월 예측.",
    href: "/executive",
  },
  {
    label: "AI 채용공고 작성",
    desc: "부서·직급·요구사항 → 한국 표준 양식 채용공고 자동 생성.",
    href: "/recruiting",
  },
];

const SHORTCUTS: Shortcut[] = [
  { keys: ["Ctrl", "K"], desc: "전역 검색 — 직원·거래처·지출 통합" },
  { keys: ["Ctrl", "J"], desc: "Ask Nexus — AI 자연어 질의" },
  { keys: ["?"], desc: "이 도움말 열기" },
  { keys: ["Esc"], desc: "모달·패널 닫기" },
  { keys: ["g", "d"], desc: "대시보드로 이동 (vim 스타일)" },
  { keys: ["g", "e"], desc: "직원 정보로 이동" },
  { keys: ["g", "p"], desc: "급여 계산으로 이동" },
];

const TIPS: { title: string; body: string }[] = [
  {
    title: "EN 토글",
    body: "우상단 EN 버튼으로 영어 즉시 전환 (낙관적 UI — 클릭 즉시 반응).",
  },
  {
    title: "Mobile",
    body: "768px 이하에서는 사이드바가 햄버거 + 하단 탭바로 자동 전환. 전 페이지 모바일 검증됨.",
  },
  {
    title: "RBAC",
    body: "admin / hr / finance / employee 4-tier. 사이드바 메뉴는 권한별 자동 필터.",
  },
  {
    title: "Demo Data",
    body: "데모 계정 사용 시 1년치 시나리오 데이터 자동 생성. 24시간 후 자동 초기화.",
  },
];

const LEGAL_REFS: LinkItem[] = [
  {
    label: "근로기준법 (제53조 연장근로, §56 가산수당, §60 연차)",
    href: "https://www.law.go.kr",
    external: true,
  },
  { label: "국민건강보험공단 요율 공지", href: "https://www.nhis.or.kr", external: true },
  { label: "국세청 근로소득 간이세액표", href: "https://www.nts.go.kr", external: true },
  { label: "근로자퇴직급여보장법 §8", href: "https://www.law.go.kr", external: true },
];

function resetTour() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tour-seen");
  window.location.reload();
}

export function HelpModal({ open, onClose }: Props) {
  useBodyScrollLock(open);
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="도움말"
      className="fixed inset-0 z-[100] flex items-start justify-center bg-bg/[0.78] px-6 pt-24 backdrop-blur-[10px]"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-[820px] flex-col border border-line-2 bg-bg-1 shadow-[0_40px_100px_rgba(0,0,0,0.6)] animate-modal-in"
      >
        <div aria-hidden className="pointer-events-none absolute inset-0 border border-gold/15" />

        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          className="absolute right-3 top-3 z-10 flex h-7 w-7 items-center justify-center border border-line text-text-3 hover:border-line-2 hover:text-text-1"
        >
          ✕
        </button>

        {/* Header */}
        <div className="border-b border-line px-6 py-5">
          <div className="eyebrow">
            <b>·</b>Help · Center
          </div>
          <h2 className="mt-2 font-serif text-[28px] italic text-text-1">
            Help <em className="text-gold">Center.</em>
          </h2>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-text-3">
            Full guide · Shortcuts · Legal references
          </p>
        </div>

        {/* Body */}
        <div className="flex-1 space-y-8 overflow-y-auto p-6">
          {/* Quick start */}
          <section className="border border-gold-soft/40 bg-gold/[0.06] p-5">
            <div className="eyebrow">
              <b>·</b>Quick Start
            </div>
            <h3 className="mt-2 font-serif text-[20px] italic text-text-1">
              빠른 <em className="text-gold">시작.</em>
            </h3>
            <ol className="mt-4 space-y-2 font-mono text-[12px] text-text-2">
              <li className="flex gap-3">
                <span className="font-serif text-[16px] italic text-gold">01.</span>
                <span>좌측 사이드바에서 페이지 이동 (모바일은 햄버거)</span>
              </li>
              <li className="flex gap-3">
                <span className="font-serif text-[16px] italic text-gold">02.</span>
                <span>
                  <kbd className="border border-line bg-bg px-1.5 py-0.5 text-text-1">Ctrl</kbd>
                  {" + "}
                  <kbd className="border border-line bg-bg px-1.5 py-0.5 text-text-1">J</kbd>
                  {" 로 AI 자연어 질의 시도"}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-serif text-[16px] italic text-gold">03.</span>
                <span>지출 등록에서 영수증 사진 업로드 → AI OCR 자동 입력</span>
              </li>
              <li className="flex gap-3">
                <span className="font-serif text-[16px] italic text-gold">04.</span>
                <span>월말결산 페이지에서 체크리스트 진행률 확인</span>
              </li>
            </ol>
            <button
              type="button"
              onClick={resetTour}
              className="btn btn-primary mt-4"
            >
              <span>✦</span>
              사이트 투어 다시보기
            </button>
          </section>

          {/* Pages by category */}
          <Section eyebrow="Pages" title="Page" titleEm="Guide.">
            <div className="space-y-5">
              {PAGE_GUIDE.map((cat) => (
                <div key={cat.category}>
                  <h4 className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-text-3">
                    <span className="mr-3 text-gold">·</span>
                    {cat.category}
                  </h4>
                  <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {cat.items.map((item) => (
                      <li key={item.label}>
                        <Link
                          href={item.href as never}
                          onClick={onClose}
                          className="flex flex-col gap-1 border border-line bg-bg p-3 transition-colors hover:border-gold-soft hover:bg-gold/[0.04]"
                        >
                          <span className="font-serif text-[14px] italic text-text-1">
                            {item.label}
                          </span>
                          {item.desc ? (
                            <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                              {item.desc}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </Section>

          {/* AI features */}
          <Section eyebrow="AI · 5 Features" title="AI" titleEm="Features.">
            <ul className="space-y-2">
              {AI_FEATURES.map((item) => (
                <li key={item.label}>
                  {item.href === "#" ? (
                    <div className="border border-line bg-bg p-3">
                      <span className="font-serif text-[14px] italic text-text-1">
                        {item.label}
                      </span>
                      {item.desc ? (
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                          {item.desc}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <Link
                      href={item.href as never}
                      onClick={onClose}
                      className="flex flex-col gap-1 border border-line bg-bg p-3 transition-colors hover:border-gold-soft hover:bg-gold/[0.04]"
                    >
                      <span className="font-serif text-[14px] italic text-text-1">
                        {item.label}
                      </span>
                      {item.desc ? (
                        <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                          {item.desc}
                        </span>
                      ) : null}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Section>

          {/* Shortcuts */}
          <Section eyebrow="Keyboard" title="Keyboard" titleEm="Shortcuts.">
            <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {SHORTCUTS.map((s) => (
                <li
                  key={s.desc}
                  className="flex items-center justify-between gap-3 border border-line bg-bg px-3 py-2.5"
                >
                  <span className="text-[13px] text-text-1">{s.desc}</span>
                  <span className="flex items-center gap-1">
                    {s.keys.map((k, idx) => (
                      <span key={idx} className="flex items-center gap-1">
                        {idx > 0 ? (
                          <span className="font-mono text-[10px] text-text-3">+</span>
                        ) : null}
                        <kbd className="border border-line-2 bg-bg-1 px-1.5 py-0.5 font-mono text-[10px] text-text-1">
                          {k}
                        </kbd>
                      </span>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Section>

          {/* Tips */}
          <Section eyebrow="Tips" title="Useful" titleEm="Tips.">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {TIPS.map((tip) => (
                <div
                  key={tip.title}
                  className="border border-gold-soft/30 bg-gold/[0.04] p-3"
                >
                  <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-gold">
                    {tip.title}
                  </div>
                  <p className="mt-1 text-[13px] text-text-2">{tip.body}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Legal refs */}
          <Section eyebrow="Legal · 2026" title="Legal" titleEm="References.">
            <ul className="space-y-1.5">
              {LEGAL_REFS.map((item) => (
                <li key={item.label}>
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between border border-line bg-bg px-3 py-2.5 text-[13px] text-text-2 transition-colors hover:border-gold-soft hover:text-gold"
                  >
                    <span>{item.label}</span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]">
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </Section>

          {/* Support */}
          <Section eyebrow="Support" title="Support &" titleEm="Repository.">
            <a
              href="https://github.com/yenooooooo/pro"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between border border-line bg-bg px-3 py-2.5 text-[13px] text-text-2 transition-colors hover:border-gold-soft hover:text-gold"
            >
              <span>GitHub 저장소</span>
              <span className="font-mono text-[10px] uppercase tracking-[0.12em]">↗</span>
            </a>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  titleEm,
  children,
}: {
  eyebrow: string;
  title: string;
  titleEm: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-4">
        <div className="eyebrow">
          <b>·</b>
          {eyebrow}
        </div>
        <h3 className="mt-2 font-serif text-[22px] italic text-text-1">
          {title} <em className="text-gold">{titleEm}</em>
        </h3>
      </div>
      {children}
    </section>
  );
}
