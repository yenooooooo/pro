"use client";

import { useEffect } from "react";
import { ExternalLink, X, BookOpen, FileText, Mail } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

type HelpItem = { label: string; href: string; external?: boolean };
type HelpSection = {
  title: string;
  icon: typeof BookOpen;
  items: HelpItem[];
};

const SECTIONS: HelpSection[] = [
  {
    title: "주요 기능 가이드",
    icon: BookOpen,
    items: [
      { label: "월말결산 운영 흐름", href: "/closing" },
      { label: "급여 일괄 계산", href: "/payroll" },
      { label: "직원 엑셀 가져오기", href: "/employees/import" },
      { label: "감사 로그 확인", href: "/audit-logs" },
    ],
  },
  {
    title: "법적 근거 (2026년 기준)",
    icon: FileText,
    items: [
      { label: "근로기준법 (제56조 가산수당, 제60조 연차)", href: "https://www.law.go.kr", external: true },
      { label: "국민건강보험공단 요율 공지", href: "https://www.nhis.or.kr", external: true },
      { label: "국세청 근로소득 간이세액표", href: "https://www.nts.go.kr", external: true },
    ],
  },
  {
    title: "지원",
    icon: Mail,
    items: [
      { label: "GitHub 저장소", href: "https://github.com/yenooooooo/pro", external: true },
    ],
  },
];

function resetTour() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("tour-seen");
  window.location.reload();
}

export function HelpModal({ open, onClose }: Props) {
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-outline-variant/30 bg-surface-container shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-outline-variant/30 px-5 py-4">
          <div>
            <h2 className="text-headline-md font-semibold text-on-surface">도움말</h2>
            <p className="mt-0.5 text-label-sm text-on-surface-variant">
              Nexus ERP 사용 가이드 및 법적 근거 자료
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="rounded p-1 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        <div className="max-h-[70vh] space-y-5 overflow-y-auto p-5">
          <button
            type="button"
            onClick={resetTour}
            className="inline-flex items-center gap-2 rounded-lg border border-primary-electric/40 bg-primary-electric/10 px-3 py-2 text-label-sm font-semibold text-primary-electric transition-colors hover:bg-primary-electric/20"
          >
            ✨ 사이트 투어 다시보기
          </button>
          {SECTIONS.map((section) => {
            const SectionIcon = section.icon;
            return (
              <div key={section.title}>
                <div className="mb-2 flex items-center gap-2">
                  <SectionIcon
                    aria-hidden
                    className="h-4 w-4 text-primary-electric"
                  />
                  <h3 className="text-body-md font-semibold text-on-surface">
                    {section.title}
                  </h3>
                </div>
                <ul className="space-y-1">
                  {section.items.map((item) => (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        {...(item.external
                          ? { target: "_blank", rel: "noopener noreferrer" }
                          : {})}
                        onClick={() => {
                          if (!item.external) onClose();
                        }}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-body-md text-on-surface-variant transition-colors hover:bg-surface-container-high hover:text-on-surface"
                      >
                        <span>{item.label}</span>
                        {item.external ? (
                          <ExternalLink
                            aria-hidden
                            className="h-3.5 w-3.5 opacity-60"
                          />
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
