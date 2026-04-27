import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AssetForm, STATUS_DB_TO_FORM, type AssetFormValues } from "@/components/features/assets/AssetForm";

type AssetDetail = {
  id: string;
  asset_no: string | null;
  name: string;
  category: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  useful_life: number | null;
  assigned_to: string | null;
  location: string | null;
  status: string;
  memo: string | null;
};

export default async function EditAssetPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const [{ data: asset }, { data: employees }] = await Promise.all([
    supabase
      .from("assets")
      .select(
        "id, asset_no, name, category, acquisition_date, acquisition_cost, useful_life, assigned_to, location, status, memo",
      )
      .eq("id", params.id)
      .maybeSingle()
      .returns<AssetDetail | null>(),
    supabase
      .from("employees")
      .select("id, name")
      .is("deleted_at", null)
      .eq("status", "active")
      .order("name")
      .returns<{ id: string; name: string }[]>(),
  ]);

  if (!asset) notFound();

  const formStatus: AssetFormValues["status"] = STATUS_DB_TO_FORM[asset.status] ?? "in_use";

  return (
    <div className="space-y-stack-lg">
      <div>
        <Link
          href="/assets"
          className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          자산 목록으로
        </Link>
        <h2 className="mt-3 text-headline-lg font-semibold tracking-tight text-on-surface">
          {asset.name} 편집
        </h2>
      </div>

      <AssetForm
        mode="edit"
        assetId={asset.id}
        initialValues={{
          asset_no: asset.asset_no ?? "",
          name: asset.name,
          category: asset.category ?? "",
          acquisition_date: asset.acquisition_date ?? "",
          acquisition_cost: asset.acquisition_cost ?? undefined,
          useful_life: asset.useful_life ?? undefined,
          assigned_to: asset.assigned_to ?? "",
          location: asset.location ?? "",
          status: formStatus,
          memo: asset.memo ?? "",
        }}
        employees={employees ?? []}
      />
    </div>
  );
}
