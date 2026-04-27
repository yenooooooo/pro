import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { VendorForm } from "@/components/features/vendors/VendorForm";

export default function NewVendorPage() {
  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/vendors"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          거래처 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          신규 거래처 등록
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          기본 정보 + 계약 기간 입력. 만료 30일 이전부터 자동 알림됩니다.
        </p>
      </div>
      <VendorForm mode="create" />
    </div>
  );
}
