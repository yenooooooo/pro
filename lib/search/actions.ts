"use server";

import { createClient } from "@/lib/supabase/server";

export type SearchHit = {
  id: string;
  type: "employee" | "vendor" | "asset" | "expense";
  title: string;
  subtitle: string;
  href: string;
};

const LIMIT_PER_TYPE = 5;

/**
 * 전역 검색 — 직원/거래처/자산/지출에서 최대 LIMIT_PER_TYPE 건씩 ilike 매칭.
 * 빈 쿼리 또는 2자 미만은 빈 결과 반환.
 */
export async function globalSearchAction(query: string): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const pattern = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const supabase = createClient();
  const hits: SearchHit[] = [];

  try {
    const { data: employees } = await supabase
      .schema("chongmu")
      .from("employees")
      .select("id, name, employee_no, phone, email")
      .is("deleted_at", null)
      .or(
        `name.ilike.${pattern},employee_no.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`,
      )
      .limit(LIMIT_PER_TYPE);

    for (const e of employees ?? []) {
      hits.push({
        id: `emp-${e.id}`,
        type: "employee",
        title: e.name,
        subtitle: `${e.employee_no ?? ""} · ${e.email ?? e.phone ?? ""}`.trim(),
        href: `/employees/${e.id}`,
      });
    }
  } catch {
    /* fail-soft */
  }

  try {
    const { data: vendors } = await supabase
      .schema("chongmu")
      .from("vendors")
      .select("id, name, business_no, contact_person")
      .or(
        `name.ilike.${pattern},business_no.ilike.${pattern},contact_person.ilike.${pattern}`,
      )
      .limit(LIMIT_PER_TYPE);

    for (const v of vendors ?? []) {
      hits.push({
        id: `ven-${v.id}`,
        type: "vendor",
        title: v.name,
        subtitle: `${v.business_no ?? ""} · ${v.contact_person ?? ""}`.trim(),
        href: `/vendors/${v.id}`,
      });
    }
  } catch {
    /* fail-soft */
  }

  try {
    const { data: assets } = await supabase
      .schema("chongmu")
      .from("assets")
      .select("id, name, asset_no, location")
      .or(`name.ilike.${pattern},asset_no.ilike.${pattern},location.ilike.${pattern}`)
      .limit(LIMIT_PER_TYPE);

    for (const a of assets ?? []) {
      hits.push({
        id: `asset-${a.id}`,
        type: "asset",
        title: a.name,
        subtitle: `${a.asset_no ?? ""} · ${a.location ?? ""}`.trim(),
        href: `/assets`,
      });
    }
  } catch {
    /* fail-soft */
  }

  try {
    const { data: expenses } = await supabase
      .schema("chongmu")
      .from("expenses")
      .select("id, description, amount, expense_date")
      .ilike("description", pattern)
      .order("expense_date", { ascending: false })
      .limit(LIMIT_PER_TYPE);

    for (const e of expenses ?? []) {
      hits.push({
        id: `exp-${e.id}`,
        type: "expense",
        title: e.description ?? "(설명 없음)",
        subtitle: `${e.expense_date} · ${e.amount?.toLocaleString() ?? "0"}원`,
        href: `/expenses`,
      });
    }
  } catch {
    /* fail-soft */
  }

  return hits;
}
