import Link from "next/link";
import {
  AlertTriangle,
  Car,
  Coins,
  Laptop,
  Package,
  PackageCheck,
  Plus,
  Sofa,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
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

// DB enum 값 → 아이콘
const DEFAULT_CATEGORY_ICON: Record<string, typeof Package> = {
  it_device: Laptop,
  furniture: Sofa,
  vehicle: Car,
};

// DB enum 값 → 색상
const STATUS_COLOR: Record<string, string> = {
  in_use: "border-tertiary-sky/30 bg-tertiary-sky/10 text-tertiary-sky",
  repair: "border-primary-electric/30 bg-primary-electric/10 text-primary-electric",
  disposed: "border-error-soft/30 bg-error-soft/10 text-error-soft",
  sold: "border-outline-variant/40 bg-surface-container text-on-surface-variant",
};

const ASSIGNEE_TONES = ["primary", "secondary", "error"] as const;

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
  const decorated = assets.map((a, i) => decorate(a, today, i));

  const totalCost = decorated.reduce((s, a) => s + (a.acquisitionCost ?? 0), 0);
  const totalBookValue = decorated.reduce(
    (s, a) => s + (a.depreciation?.bookValue ?? a.acquisitionCost ?? 0),
    0,
  );
  const residualRatio = totalCost > 0 ? totalBookValue / totalCost : 0;
  const totalAccumulated = totalCost - totalBookValue;

  const expiring = decorated.filter(
    (a) => a.lifecycleStatus === "expiring" || a.lifecycleStatus === "expired",
  );

  const categoryGroups = aggregateByCategory(decorated);

  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            자산 관리
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            고정자산 대장 · 정액법 감가상각 · 내용연수 추적 · {decorated.length}건
          </p>
        </div>
        <Link
          href="/assets/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" />
          자산 등록
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="총 자산"
          value={String(decorated.length)}
          unit="대"
          icon={Package}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth="100%"
        />
        <KPICard
          label="취득 총액"
          value={`₩${formatCompactKRW(totalCost)}`}
          icon={Coins}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth="80%"
        />
        <KPICard
          label="내용연수 임박/만료"
          labelTone={expiring.length > 0 ? "text-error-soft" : undefined}
          value={String(expiring.length)}
          unit="건"
          valueTone={expiring.length > 0 ? "text-error-soft" : undefined}
          icon={AlertTriangle}
          iconTone={
            expiring.length > 0 ? "text-error-soft" : "text-on-surface-variant"
          }
          barTone={expiring.length > 0 ? "bg-error-soft animate-pulse" : "bg-outline"}
          barWidth={expiring.length > 0 ? "20%" : "0%"}
          glowText={expiring.length > 0}
        />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-xl p-stack-md sm:flex-row sm:items-center">
            <AssetFilters
              q={q}
              category={category}
              status={status}
              categories={allCategories}
              statuses={allStatuses}
            />
            <div className="text-label-sm text-on-surface-variant">
              {decorated.length}건
            </div>
          </div>

          <div className="glass-panel overflow-x-auto rounded-xl">
            {decorated.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
                <Package aria-hidden className="h-10 w-10 text-outline-variant" />
                <p className="text-body-md text-on-surface-variant">
                  {q || category || status
                    ? "조건에 일치하는 자산이 없습니다."
                    : "등록된 자산이 없습니다. 우측 상단 「자산 등록」을 눌러 시작하세요."}
                </p>
              </div>
            ) : (
              <table className="w-full min-w-[920px] border-collapse text-left">
                <thead className="border-b border-outline-variant/20 bg-surface-container/30 text-label-sm text-on-surface-variant">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold">
                      자산번호 · 분류
                    </th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold">자산명</th>
                    <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">
                      취득가
                    </th>
                    <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">
                      장부가액
                    </th>
                    <th className="whitespace-nowrap px-6 py-4 text-right font-semibold">
                      잔여연수
                    </th>
                    <th className="whitespace-nowrap px-6 py-4 font-semibold">담당</th>
                    <th className="whitespace-nowrap px-6 py-4 text-center font-semibold">
                      상태
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10 text-data-tabular text-on-surface">
                  {decorated.map((a) => (
                    <AssetRow key={a.id} asset={a} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <PackageCheck aria-hidden className="h-5 w-5 text-primary-electric" />
              자산 가치 평가
            </h3>

            <div className="space-y-4">
              <div>
                <div className="mb-1 text-label-sm text-on-surface-variant">
                  취득 총액
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-on-surface">
                  {formatKRW(totalCost)}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-label-sm text-on-surface-variant">
                    장부가액 (정액법)
                  </span>
                  <span className="text-label-sm text-tertiary-sky">
                    {Math.round(residualRatio * 100)}%
                  </span>
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-primary-electric">
                  {formatKRW(totalBookValue)}
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    aria-hidden
                    className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary-electric"
                    style={{ width: `${Math.round(residualRatio * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-label-sm text-on-surface-variant">
                  누적 감가 {formatKRW(totalAccumulated)}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Package aria-hidden className="h-5 w-5 text-tertiary-sky" />
              분류별 구성
            </h3>
            {categoryGroups.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">데이터 없음</p>
            ) : (
              <ul className="space-y-3">
                {categoryGroups.map((g) => {
                  const ratio = totalCost > 0 ? g.cost / totalCost : 0;
                  return (
                    <li key={g.name}>
                      <div className="mb-1 flex items-baseline justify-between">
                        <span className="text-label-sm font-medium text-on-surface">
                          {label(ASSET_CATEGORY_LABEL, g.name)}
                        </span>
                        <span className="text-label-sm tabular-nums text-on-surface-variant">
                          {g.count}개 · ₩{formatCompactKRW(g.cost)}
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                        <div
                          aria-hidden
                          className="h-full rounded-full bg-primary-electric"
                          style={{ width: `${Math.round(ratio * 100)}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
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
  assigneeTone: "primary" | "secondary" | "error";
  depreciation: DepreciationResult | null;
  lifecycleStatus: "ok" | "expiring" | "expired";
};

function decorate(a: AssetDbRow, today: Date, index: number): DecoratedAsset {
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
    assigneeTone: ASSIGNEE_TONES[index % ASSIGNEE_TONES.length],
    depreciation,
    lifecycleStatus,
  };
}

function aggregateByCategory(
  rows: DecoratedAsset[],
): Array<{ name: string; count: number; cost: number }> {
  const map = new Map<string, { name: string; count: number; cost: number }>();
  for (const r of rows) {
    const key = r.category ?? "기타";
    const cur = map.get(key) ?? { name: key, count: 0, cost: 0 };
    cur.count += 1;
    cur.cost += r.acquisitionCost ?? 0;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

function formatCompactKRW(n: number): string {
  const { value, unit } = formatKRWCompact(n);
  return `${value}${unit}`;
}

function AssetRow({ asset }: { asset: DecoratedAsset }) {
  const isExpiring =
    asset.lifecycleStatus === "expiring" || asset.lifecycleStatus === "expired";
  const CategoryIcon = asset.category
    ? (DEFAULT_CATEGORY_ICON[asset.category] ?? Package)
    : Package;
  const remainingLabel =
    asset.depreciation === null
      ? "—"
      : formatRemainingYears(asset.depreciation.remainingYears);
  return (
    <tr
      className={cn(
        "group transition-colors hover:bg-surface-container/40",
        isExpiring && "relative bg-error-soft/5 hover:bg-error-soft/10",
      )}
    >
      <td className={cn("whitespace-nowrap px-6 py-3", isExpiring && "relative pl-7")}>
        {isExpiring ? (
          <span
            aria-hidden
            className="absolute left-0 top-0 h-full w-1 bg-error-soft opacity-70"
          />
        ) : null}
        <Link
          href={`/assets/${asset.id}/edit`}
          className="flex items-center gap-3 transition-colors hover:text-primary-electric"
        >
          <div
            aria-hidden
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-primary-electric/20 bg-primary-electric/10 text-primary-electric"
          >
            <CategoryIcon className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-on-surface group-hover:text-primary-electric">
              {asset.assetNo}
            </div>
            <div className="text-xs text-on-surface-variant">
              {asset.category ? label(ASSET_CATEGORY_LABEL, asset.category) : "—"}
            </div>
          </div>
        </Link>
      </td>
      <td className="whitespace-nowrap px-6 py-3">
        <div className="font-medium text-on-surface">{asset.name}</div>
        <div className="text-xs text-on-surface-variant">{asset.location ?? "—"}</div>
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">
        {asset.acquisitionCost ? formatKRW(asset.acquisitionCost) : "—"}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right tabular-nums">
        {asset.depreciation ? formatKRW(asset.depreciation.bookValue) : "—"}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-right">
        <span
          className={cn(
            "tabular-nums",
            isExpiring ? "text-error-soft" : "text-on-surface",
          )}
        >
          {remainingLabel}
        </span>
      </td>
      <td className="whitespace-nowrap px-6 py-3">
        {asset.assignee ? (
          <div className="flex items-center gap-2">
            <InitialsAvatar
              name={asset.assignee.name}
              size="sm"
              tone={asset.assigneeTone}
            />
            <span>{asset.assignee.name}</span>
          </div>
        ) : (
          <span className="text-on-surface-variant">공용</span>
        )}
      </td>
      <td className="whitespace-nowrap px-6 py-3 text-center">
        <span
          className={cn(
            "inline-flex whitespace-nowrap items-center rounded-md border px-2 py-1 text-xs font-medium",
            STATUS_COLOR[asset.status] ??
              "border-outline-variant/40 bg-surface-container text-on-surface-variant",
          )}
        >
          {label(ASSET_STATUS_LABEL, asset.status)}
        </span>
      </td>
    </tr>
  );
}

function KPICard({
  label,
  labelTone,
  value,
  valueTone,
  unit,
  icon: Icon,
  iconTone,
  barTone,
  barWidth,
  glowText,
}: {
  label: string;
  labelTone?: string;
  value: string;
  valueTone?: string;
  unit?: string;
  icon: typeof Package;
  iconTone: string;
  barTone: string;
  barWidth: string;
  glowText?: boolean;
}) {
  return (
    <div className="glass-panel relative flex h-32 flex-col justify-between overflow-hidden rounded-lg p-stack-md">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            "text-label-sm uppercase tracking-wider",
            labelTone ?? "text-on-surface-variant",
          )}
        >
          {label}
        </span>
        <Icon aria-hidden className={cn("h-5 w-5 opacity-70", iconTone)} />
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-display-xl font-bold tracking-tighter tabular-nums",
            valueTone ?? "text-on-surface",
            glowText && "drop-shadow-[0_0_10px_rgba(255,180,171,0.5)]",
          )}
        >
          {value}
        </span>
        {unit ? (
          <span className="text-data-tabular text-on-surface-variant">{unit}</span>
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn("absolute bottom-0 left-0 h-1", barTone)}
        style={{ width: barWidth }}
      />
    </div>
  );
}
