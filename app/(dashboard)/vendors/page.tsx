import Link from "next/link";
import { differenceInDays } from "date-fns";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import { VendorFilters } from "./_components/vendor-filters";
import { VENDOR_CATEGORY_LABEL, label } from "@/lib/labels";

type VendorRow = {
  id: string;
  name: string;
  business_no: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  contract_start: string | null;
  contract_end: string | null;
  category: string | null;
};

const EXPIRY_THRESHOLD_DAYS = 30;

export default async function VendorsPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const category = searchParams?.category ?? null;

  const supabase = createClient();
  let query = supabase
    .from("vendors")
    .select(
      "id, name, business_no, contact_person, phone, email, contract_start, contract_end, category",
    )
    .order("name");
  if (category) query = query.eq("category", category);
  if (q) {
    // 이름·사업자번호·담당자에 부분일치
    const pat = `%${q}%`;
    query = query.or(
      `name.ilike.${pat},business_no.ilike.${pat},contact_person.ilike.${pat}`,
    );
  }
  const { data: rawVendors } = await query.returns<VendorRow[]>();
  const vendors = rawVendors ?? [];

  // 카테고리 옵션은 검색 무관하게 전체 목록에서 추출.
  const { data: allForCats } = await supabase
    .from("vendors")
    .select("category")
    .not("category", "is", null)
    .returns<{ category: string }[]>();
  const categories = Array.from(
    new Set((allForCats ?? []).map((v) => v.category).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const today = new Date();
  const decorated = vendors.map((v) => decorate(v, today));
  const expiringSoon = decorated.filter(
    (v) => v.daysToExpiry !== null && v.daysToExpiry >= 0 && v.daysToExpiry <= EXPIRY_THRESHOLD_DAYS,
  );
  const expired = decorated.filter(
    (v) => v.daysToExpiry !== null && v.daysToExpiry < 0,
  );
  const activeCount = decorated.filter(
    (v) => v.daysToExpiry === null || v.daysToExpiry >= 0,
  ).length;

  const t = await getTranslations("vendors");

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M07</b>Records · Vendors
          </div>
          <h1 className="page-h">
            거래처 <em>{decorated.length}.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/vendors/new" className="btn btn-primary">
            + {t("add")}
          </Link>
        </div>
      </header>

      {/* ===== KPI Row ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line md:grid-cols-3">
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_total")}</div>
          <div className="kpi-v">
            {decorated.length.toLocaleString("ko-KR")}
            <span className="ml-1 text-[16px] text-text-3">개</span>
          </div>
          <div className="kpi-meta">
            <span>등록 전체</span>
            <span />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">{t("kpi_active_contracts")}</div>
          <div className="kpi-v">
            {activeCount.toLocaleString("ko-KR")}
            <span className="ml-1 text-[16px] text-text-3">개</span>
          </div>
          <div className="kpi-meta">
            <span>
              {decorated.length > 0
                ? `${Math.round((activeCount / decorated.length) * 100)}% 활성`
                : "데이터 없음"}
            </span>
            <span />
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-l">
            {t("kpi_expiring_soon")} · D-{EXPIRY_THRESHOLD_DAYS}
          </div>
          <div
            className={cn(
              "kpi-v",
              expiringSoon.length + expired.length > 0 && "danger",
            )}
          >
            {(expiringSoon.length + expired.length).toLocaleString("ko-KR")}
            <span className="ml-1 text-[16px] text-text-3">건</span>
          </div>
          <div className="kpi-meta">
            <span>
              {expired.length > 0 ? `만료 ${expired.length}건 · ` : ""}
              {expiringSoon.length > 0 ? `임박 ${expiringSoon.length}건` : "이상 없음"}
            </span>
            <span />
          </div>
        </div>
      </div>

      {/* ===== 만료 임박/만료 배너 ===== */}
      {expiringSoon.length > 0 || expired.length > 0 ? (
        <div className="mb-9">
          <ExpiryBanner expiringSoon={expiringSoon} expired={expired} />
        </div>
      ) : null}

      {/* ===== Filter Bar ===== */}
      <div className="mb-9 border border-line bg-bg p-5">
        <VendorFilters q={q} category={category} categories={categories} />
      </div>

      {/* ===== Section rule ===== */}
      <div className="section-rule">
        <span className="l">
          <b>M07.01</b>Vendors · Directory
        </span>
        <span className="line" />
      </div>

      {/* ===== Vendor table ===== */}
      <section className="panel">
        <div className="panel-h">
          <div className="t font-serif">
            거래처 <em>장부.</em>
          </div>
          <div className="meta">{decorated.length}건</div>
        </div>
        {decorated.length === 0 ? (
          <div className="border-t border-line py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            {q || category
              ? "조건에 일치하는 거래처가 없습니다."
              : "등록된 거래처가 없습니다. 우측 상단 「거래처 추가」를 눌러 시작하세요."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl min-w-[820px]">
              <thead>
                <tr>
                  <th>거래처</th>
                  <th>분류</th>
                  <th>담당자</th>
                  <th>연락처</th>
                  <th>계약 기간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {decorated.map((v) => (
                  <VendorRowTr key={v.id} vendor={v} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type DecoratedVendor = VendorRow & {
  daysToExpiry: number | null;
  contractRange: string;
};

function decorate(v: VendorRow, today: Date): DecoratedVendor {
  const daysToExpiry = v.contract_end
    ? differenceInDays(new Date(v.contract_end), today)
    : null;
  const start = v.contract_start ? formatDate(v.contract_start) : "—";
  const end = v.contract_end ? formatDate(v.contract_end) : "—";
  return {
    ...v,
    daysToExpiry,
    contractRange: `${start} ~ ${end}`,
  };
}

function formatDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  return `${iso.slice(0, 4)}.${iso.slice(5, 7)}.${iso.slice(8, 10)}`;
}

function ExpiryBanner({
  expiringSoon,
  expired,
}: {
  expiringSoon: DecoratedVendor[];
  expired: DecoratedVendor[];
}) {
  return (
    <div className="border border-gold-soft bg-gold/[0.06] p-5">
      <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-gold">
        <span className="h-[6px] w-[6px] rounded-full bg-gold" />
        계약 갱신 검토 필요
        {expiringSoon.length > 0 ? ` · 임박 ${expiringSoon.length}건` : ""}
        {expired.length > 0 ? ` · 만료 ${expired.length}건` : ""}
      </div>
      <p className="mb-4 text-[13px] text-text-2">
        {EXPIRY_THRESHOLD_DAYS}일 이내 만료 예정 또는 이미 만료된 계약을 검토하세요.
      </p>
      <div className="flex flex-wrap gap-2">
        {[...expired, ...expiringSoon].slice(0, 8).map((v) => (
          <Link
            key={v.id}
            href={`/vendors/${v.id}/edit`}
            className="inline-flex items-center gap-1.5 border border-gold-soft bg-bg-1 px-3 py-1.5 font-mono text-[11px] tracking-[0.05em] text-gold transition-colors hover:bg-gold/10"
          >
            {v.name} ·{" "}
            <span className="tabular-nums">
              {v.daysToExpiry !== null && v.daysToExpiry < 0
                ? `만료 ${-v.daysToExpiry}일 경과`
                : `D-${v.daysToExpiry}`}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function VendorRowTr({ vendor }: { vendor: DecoratedVendor }) {
  const isExpiringSoon =
    vendor.daysToExpiry !== null &&
    vendor.daysToExpiry >= 0 &&
    vendor.daysToExpiry <= EXPIRY_THRESHOLD_DAYS;
  const isExpired = vendor.daysToExpiry !== null && vendor.daysToExpiry < 0;

  const status = isExpired
    ? { variant: "rej", text: `만료 ${-(vendor.daysToExpiry as number)}일 경과` }
    : isExpiringSoon
      ? { variant: "pend", text: `D-${vendor.daysToExpiry}` }
      : { variant: "ok", text: "유효" };

  return (
    <tr>
      <td>
        <Link
          href={`/vendors/${vendor.id}/edit`}
          className="block text-text-1 transition-colors hover:text-gold"
        >
          <div className="text-[13px] font-medium">{vendor.name}</div>
          {vendor.business_no ? (
            <div className="mt-[2px] font-mono text-[10px] tracking-[0.05em] text-text-3">
              사업자 {vendor.business_no}
            </div>
          ) : null}
        </Link>
      </td>
      <td>
        {vendor.category ? (
          <span className={cn("chip", chipVariantForCategory(vendor.category))}>
            <i />
            {label(VENDOR_CATEGORY_LABEL, vendor.category)}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-text-3">—</span>
        )}
      </td>
      <td className="text-text-2">{vendor.contact_person ?? "—"}</td>
      <td className="font-mono text-[12px] tabular-nums text-text-2">
        {vendor.phone ?? "—"}
        {vendor.email ? (
          <div className="mt-[2px] truncate text-text-3">{vendor.email}</div>
        ) : null}
      </td>
      <td className="font-mono text-[12px] tabular-nums text-text-2">
        {vendor.contractRange}
      </td>
      <td>
        <span className={cn("chip", status.variant)}>
          <i />
          {status.text}
        </span>
      </td>
    </tr>
  );
}

function chipVariantForCategory(category: string): string {
  switch (category) {
    case "partner":
      return "info";
    case "supplier":
      return "ok";
    case "customer":
      return "pend";
    default:
      return "";
  }
}
