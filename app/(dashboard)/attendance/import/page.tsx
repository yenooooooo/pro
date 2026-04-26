import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AttendanceImportForm } from "@/components/features/attendance/AttendanceImportForm";

export default function AttendanceImportPage() {
  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          근태 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          근태 CSV 가져오기
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          엑셀에서 내보낸 CSV로 한 번에 여러 직원·여러 일자의 근태를 등록할 수 있습니다.
        </p>
      </div>

      <AttendanceImportForm />
    </div>
  );
}
