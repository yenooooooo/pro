import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CardImportClient } from "./_client";

export const dynamic = "force-dynamic";

export default async function ExpenseImportPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .schema("chongmu")
    .from("expense_categories")
    .select("id, name")
    .order("name");

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/expenses"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        지출 목록
      </Link>

      <header>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          법인카드 명세서 임포트
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          카드사 CSV 명세서 (신한·삼성·현대 등) 를 업로드하면 자동 파싱 후 일괄 등록.
          AI 가 가맹점명을 분석해 카테고리를 자동 추천합니다.
        </p>
      </header>

      <CardImportClient categories={categories ?? []} />
    </div>
  );
}
