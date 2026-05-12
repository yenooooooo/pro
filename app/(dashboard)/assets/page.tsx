import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { formatKRW, formatRemainingYears, formatKRWCompact } from "@/lib/utils/format";
import { createClient } from "@/lib/supabase/server";
import {
  calculateDepreciation,
  classifyLifecycle,
  type DepreciationResult,
} from "@/lib/assets/depreciation";
import { AssetFilters } from "./_components/asset-filters";
import {
  ASSET_STATUS_LABEL,
  ASSET_CATEGORY_LABEL,
  label,
} from "@/lib/labels";

type AssetDbRow = {
  id: string;
  asset_no: string | null;
  name: string;
  category: string | null;
  acquisition_date: string | null;
  acquisition_cost: number | null;
  useful_life: number | null;
  location: string | null;
  status: string;
  assigned_to: string | null;
  assignee: { id: string; name: string } | null;
};

export default async function AssetsPage({
  searchParams,
}: {
  searchParams?: { q?: string; category?: string; status?: string };
}) {
  const q = (searchParams?.q ?? "").trim();
  const category = searchParams?.category ?? null;
  const status = searchParams?.status ?? null;

  const supabase = createClient();
  let query = supabase
    .from("assets")
    .select(
      `id, asset_no, name, category, acquisition_date, acquisition_cost, useful_life,
       location, status, assigned_to,
       assignee:employees(id, name)`,
    )
    .order("acquisition_date", { ascending: false });
  if (category) query = query.eq("category", category);
  if (status) query = query.eq("status", status);
  if (q) {
    const pat = `%${q}%`;
    query = query.or(`name.ilike.${pat},asset_no.ilike.${pat}`);
  }
  const { data: rawAssets } = await query.returns<AssetDbRow[]>();
  const assets = rawAssets ?? [];

  // 카테고리/상태 옵션은 전체 자산에서 추출.
  const { data: allForOptions } = await supabase
    .from("assets")
    .select("category, status")
    .returns<{ category: string | null; status: string }[]>();
  const allCategories = Array.from(
    new Set((allForOptions ?? []).map((a) => a.category).filter(Boolean) as string[]),
  ).sort((a, b) => a.localeCompare(b, "ko"));
  const allStatuses = Array.from(
    new Set((allForOptions ?? []).map((a) => a.status).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ko"));

  const today = new Date();
  const decorated = assets.map((a) => decorate(a, today));

  const totalCost = decorated.reduce((s, a) => s + (a.acquisitionCost ?? 0), 0);
  const totalBookValue = decorated.reduce(
    (s, a) => s + (a.depreciation?.bookValue ?? a.acquisitionCost ?? 0),
    0,
  );

  const inUseCount = decorated.filter((a) => a.status === "in_use").length;

  const expiring = decorated.filter(
    (a) => a.lifecycleStatus === "expiring" || a.lifecycleStatus === "expired",
  );

  const t = await getTranslations("assets");

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M08</b>Records · Assets
          </div>
          <h1 className="page-h">
            자산 <em>대장.</em>
          </h1>
          <p className="page-sub">
            {t("subtitle")} · {decorated.length}건
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/assets/new" className="btn btn-primary">
            + 자산 추가
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 xl:grid-cols-4">
        <KPI
          label="총 자산"
          value={decorated.length.toLocaleString("ko-KR")}
          suffix="대"
        />
        <KPI
          label="사용중"
          value={inUseCount.toLocaleString("ko-KR")}
          suffix="대"
          subtext={`전체 ${decorated.length}대 중`}
        />
        <KPI
          label="만료 임박"
          value={expiring.length.toLocaleString("ko-KR")}
          suffix="건"
          tone={expiring.length > 0 ? "warn" : "default"}
          subtext={expiring.length > 0 ? "내용연수 6개월 이하" : "이상 없음"}
        />
        <KPI
          label="장부가액 합계"
          value={formatKRW(totalBookValue)}
          prefix="₩"
          subtext={`취득 ${formatCompactKRW(totalCost)}`}
        />
      </div>

      {/* ===== Filters ===== */}
      <section className="panel mb-9">
        <div className="panel-h">
          <div className="t font-serif">
            자산 <em>필터</em>
          </div>
          <div className="meta">{decorated.length}건</div>
        </div>
        <AssetFilters
          q={q}
          category={category}
          status={status}
          categories={allCategories}
          statuses={allStatuses}
        />
      </section>

      {/* ===== Asset Ledger Table ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            자산 <em>대장</em>
          </div>
          <div className="meta">{decorated.length}건</div>
        </div>
        {decorated.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            {q || category || status
              ? "조건에 일치하는 자산이 없습니다."
              : "등록된 자산이 없습니다."}
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[920px]">
              <thead>
                <tr>
                  <th>자산번호</th>
                  <th>자산명</th>
                  <th>분류</th>
                  <th>취득일</th>
                  <th className="text-right">내용연수</th>
                  <th className="text-right">장부가</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {decorated.map((a) => (
                  <AssetRow key={a.id} asset={a} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type DecoratedAsset = {
  id: string;
  assetNo: string;
  name: string;
  category: string | null;
  location: string | null;
  status: string;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  usefulLife: number | null;
  assignee: { id: string; name: string } | null;
  depreciation: DepreciationResult | null;
  lifecycleStatus: "ok" | "expiring" | "expired";
};

function decorate(a: AssetDbRow, today: Date): DecoratedAsset {
  let depreciation: DepreciationResult | null = null;
  if (a.acquisition_date && a.acquisition_cost && a.useful_life) {
    depreciation = calculateDepreciation(
      {
        acquisitionDate: new Date(a.acquisition_date),
        acquisitionCost: a.acquisition_cost,
        usefulLifeYears: a.useful_life,
      },
      today,
    );
  }
  const lifecycleStatus = classifyLifecycle(depreciation?.remainingYears ?? null);
  return {
    id: a.id,
    assetNo: a.asset_no ?? "—",
    name: a.name,
    category: a.category,
    location: a.location,
    status: a.status,
    acquisitionDate: a.acquisition_date,
    acquisitionCost: a.acquisition_cost,
    usefulLife: a.useful_life,
    assignee: a.assignee,
    depreciation,
    lifecycleStatus,
  };
}

function formatCompactKRW(n: number): string {
  const { value, unit } = formatKRWCompact(n);
  return `₩${value}${unit}`;
}

function statusChipClass(status: string): string {
  switch (status) {
    case "in_use":
      return "chip ok";
    case "repair":
      return "chip pend";
    case "disposed":
      return "chip rej";
    case "sold":
      return "chip info";
    default:
      return "chip";
  }
}

function AssetRow({ asset }: { asset: DecoratedAsset }) {
  const isExpiring =
    asset.lifecycleStatus === "expiring" || asset.lifecycleStatus === "expired";
  const remainingLabel =
    asset.depreciation === null
      ? "—"
      : formatRemainingYears(asset.depreciation.remainingYears);
  return (
    <tr>
      <td className="font-mono text-[12px]">
        <Link
          href={`/assets/${asset.id}/edit`}
          className="text-text-1 transition-colors hover:text-gold"
        >
          {asset.assetNo}
        </Link>
      </td>
      <td>
        <span className="text-text-1">{asset.name}</span>
        {asset.location ? (
          <span className="ml-2 font-mono text-[10px] text-text-3">
            {asset.location}
          </span>
        ) : null}
      </td>
      <td>{asset.category ? label(ASSET_CATEGORY_LABEL, asset.category) : "—"}</td>
      <td className="font-mono text-[12px]">{asset.acquisitionDate ?? "—"}</td>
      <td className={cn("n", isExpiring && "text-gold italic")}>
        {remainingLabel}
      </td>
      <td className="n">
        {asset.depreciation ? formatKRW(asset.depreciation.bookValue) : "—"}
      </td>
      <td>
        <span className={statusChipClass(asset.status)}>
          <i />
          {label(ASSET_STATUS_LABEL, asset.status)}
        </span>
      </td>
    </tr>
  );
}

/* ============================================================
 * KPI primitive (v2 editorial)
 * ============================================================ */
function KPI({
  label,
  value,
  prefix,
  suffix,
  subtext,
  tone = "default",
}: {
  label: string;
  value: string;
  prefix?: string;
  suffix?: string;
  subtext?: string;
  tone?: "default" | "warn" | "danger";
}) {
  const toneClass =
    tone === "danger"
      ? "text-[#E06B5F] italic"
      : tone === "warn"
        ? "text-gold italic"
        : "text-text-1";
  return (
    <div className="kpi-card">
      <div className="kpi-l">{label}</div>
      <div className={cn("kpi-v", toneClass)}>
        {prefix ? <span className="cur">{prefix}</span> : null}
        {value}
        {suffix ? <span className="ml-2 text-[16px] text-text-3">{suffix}</span> : null}
      </div>
      {subtext ? (
        <div className="kpi-meta">
          <span>{subtext}</span>
        </div>
      ) : null}
    </div>
  );
}
