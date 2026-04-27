import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AssetForm } from "@/components/features/assets/AssetForm";

export default async function NewAssetPage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .from("employees")
    .select("id, name")
    .is("deleted_at", null)
    .eq("status", "active")
    .order("name")
    .returns<{ id: string; name: string }[]>();

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
          신규 자산 등록
        </h2>
        <p className="mt-1 text-body-md text-on-surface-variant">
          정액법 감가상각 자동 계산. 내용연수 만료 6개월 전부터 자동 알림.
        </p>
      </div>
      <AssetForm mode="create" employees={employees ?? []} />
    </div>
  );
}
