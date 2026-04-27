import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ExpenseForm } from "@/components/features/expenses/ExpenseForm";

type ExpenseDetail = {
  id: string;
  expense_date: string;
  amount: number;
  vat: number;
  payment_method: string;
  category_id: string | null;
  vendor_id: string | null;
  description: string | null;
  receipt_url: string | null;
  is_taxable: boolean;
};

export default async function EditExpensePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: expense }, { data: categories }, { data: vendors }] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, expense_date, amount, vat, payment_method, category_id, vendor_id, description, receipt_url, is_taxable",
      )
      .eq("id", params.id)
      .maybeSingle()
      .returns<ExpenseDetail | null>(),
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

  if (!expense) notFound();

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
          지출 편집
        </h2>
      </div>

      <ExpenseForm
        mode="edit"
        expenseId={expense.id}
        initialValues={{
          expense_date: expense.expense_date,
          amount: expense.amount,
          vat: expense.vat,
          payment_method: expense.payment_method as "card" | "cash" | "transfer" | "other",
          category_id: expense.category_id ?? "",
          vendor_id: expense.vendor_id ?? "",
          description: expense.description ?? "",
          is_taxable: expense.is_taxable,
        }}
        initialReceiptUrl={expense.receipt_url}
        categories={categories ?? []}
        vendors={vendors ?? []}
      />
    </div>
  );
}
