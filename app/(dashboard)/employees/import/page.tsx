import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { EmployeeImportForm } from "@/components/features/employees/EmployeeImportForm";

export default function EmployeeImportPage() {
  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/employees"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          직원 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          직원 엑셀 가져오기
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          기존 인사 엑셀에서 사번·이름·기본급 등 핵심 정보를 한 번에 등록합니다.
        </p>
      </div>

      <EmployeeImportForm />
    </div>
  );
}
