import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VendorForm } from "@/components/features/vendors/VendorForm";

type VendorDetail = {
  id: string;
  name: string;
  business_no: string | null;
  category: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  contract_start: string | null;
  contract_end: string | null;
  memo: string | null;
};

export default async function EditVendorPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();
  const { data: vendor } = await supabase
    .from("vendors")
    .select(
      "id, name, business_no, category, contact_person, phone, email, contract_start, contract_end, memo",
    )
    .eq("id", params.id)
    .maybeSingle()
    .returns<VendorDetail | null>();

  if (!vendor) notFound();

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
          {vendor.name} 편집
        </h2>
      </div>
      <VendorForm
        mode="edit"
        vendorId={vendor.id}
        initialValues={{
          name: vendor.name,
          business_no: vendor.business_no ?? "",
          category: vendor.category ?? "",
          contact_person: vendor.contact_person ?? "",
          phone: vendor.phone ?? "",
          email: vendor.email ?? "",
          contract_start: vendor.contract_start ?? "",
          contract_end: vendor.contract_end ?? "",
          memo: vendor.memo ?? "",
        }}
      />
    </div>
  );
}
