import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/features/expenses/ExpenseForm";

export default async function NewExpensePage() {
  const supabase = createClient();
  const [{ data: categories }, { data: vendors }] = await Promise.all([
    supabase
      .from("expense_categories")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
    supabase
      .from("vendors")
      .select("id, name")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
  ]);

  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/expenses"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          지출 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          신규 지출 등록
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          영수증 첨부는 선택. 카드 결제는 영수증 없어도 「확인」 처리됩니다.
        </p>
      </div>

      <ExpenseForm
        mode="create"
        categories={categories ?? []}
        vendors={vendors ?? []}
      />
    </div>
  );
}
