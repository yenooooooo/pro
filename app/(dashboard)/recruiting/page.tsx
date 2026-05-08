import { Sparkles } from "lucide-react";
import { JobPostingGenerator } from "./_generator";

export default function RecruitingPage() {
  return (
    <div className="space-y-stack-lg">
      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <Sparkles aria-hidden className="h-4 w-4" />
          AI Recruiting Assistant
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          AI 채용 공고 작성
        </h1>
        <p className="text-body-md text-on-surface-variant">
          부서·직급·요구사항을 입력하면 한국 표준 양식의 채용 공고를 마크다운으로
          자동 생성합니다. Gemini 2.5 Flash 무료 tier 활용.
        </p>
      </header>

      <JobPostingGenerator />
    </div>
  );
}
