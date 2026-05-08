import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TripForm } from "./_form";

export const dynamic = "force-dynamic";

export default async function NewBusinessTripPage() {
  const supabase = createClient();
  const { data: employees } = await supabase
    .schema("chongmu")
    .from("employees")
    .select("id, name, employee_no")
    .eq("status", "active")
    .is("deleted_at", null)
    .order("name");

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/business-trips"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        출장 목록
      </Link>

      <header>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          출장 신청
        </h1>
        <p className="mt-1 text-body-md text-on-surface-variant">
          출장 정보를 입력하면 출장자별 정산 카드가 생성됩니다.
        </p>
      </header>

      <TripForm employees={employees ?? []} />
    </div>
  );
}
