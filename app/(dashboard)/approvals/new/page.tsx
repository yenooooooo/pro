import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ApprovalForm } from "./_form";

export default function NewApprovalPage() {
  return (
    <div className="space-y-stack-lg">
      <Link
        href="/approvals"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        결재 목록으로
      </Link>

      <header>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          새 결재 발의
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          결재선은 최대 5단계까지. 모든 단계가 승인되어야 최종 승인됩니다.
        </p>
      </header>

      <ApprovalForm />
    </div>
  );
}
