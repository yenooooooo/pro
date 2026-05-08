import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContractUploadForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function NewContractPage() {
  const supabase = createClient();
  const { data: vendors } = await supabase
    .schema("chongmu")
    .from("vendors")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/contracts"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        계약서 목록
      </Link>

      <header>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          새 계약서 등록
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          PDF 또는 이미지 업로드 → AI 가 자동 추출 → 검토 후 저장.
        </p>
      </header>

      <ContractUploadForm vendors={vendors ?? []} />
    </div>
  );
}
