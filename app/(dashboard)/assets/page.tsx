import {
  AlertTriangle,
  Car,
  ChevronDown,
  Coins,
  Download,
  Laptop,
  Package,
  PackageCheck,
  Plus,
  Search,
  Sofa,
} from "lucide-react";
import { InitialsAvatar } from "@/components/shared/InitialsAvatar";
import { cn } from "@/lib/utils/cn";
import { formatKRW, formatRemainingYears } from "@/lib/utils/format";

type AssetCategory = "IT기기" | "사무가구" | "차량" | "기타";
type AssetStatus = "사용중" | "수리중" | "폐기" | "매각";

type Asset = {
  id: string;
  assetNo: string;
  name: string;
  category: AssetCategory;
  acquisitionDate: string;
  acquisitionCost: number;
  usefulLifeYears: number;
  assignedTo: string | null;
  assignedTone: "primary" | "secondary" | "error";
  location: string;
  status: AssetStatus;
  yearsRemaining: number;
};

// Phase 5.3에서 assets 조회로 교체.
const ASSETS: Asset[] = [
  {
    id: "1",
    assetNo: "IT-2021-042",
    name: "MacBook Pro 16",
    category: "IT기기",
    acquisitionDate: "2021.05.10",
    acquisitionCost: 3_500_000,
    usefulLifeYears: 5,
    assignedTo: "김영호",
    assignedTone: "primary",
    location: "서울 본사",
    status: "사용중",
    yearsRemaining: 0.05,
  },
  {
    id: "2",
    assetNo: "IT-2022-019",
    name: "MacBook Air M2",
    category: "IT기기",
    acquisitionDate: "2022.03.15",
    acquisitionCost: 1_800_000,
    usefulLifeYears: 5,
    assignedTo: "이서연",
    assignedTone: "secondary",
    location: "서울 본사",
    status: "사용중",
    yearsRemaining: 0.9,
  },
  {
    id: "3",
    assetNo: "FR-2020-003",
    name: "회의실 원목 테이블",
    category: "사무가구",
    acquisitionDate: "2020.02.01",
    acquisitionCost: 2_400_000,
    usefulLifeYears: 5,
    assignedTo: null,
    assignedTone: "primary",
    location: "3F 회의실",
    status: "사용중",
    yearsRemaining: -0.2,
  },
  {
    id: "4",
    assetNo: "CAR-2022-001",
    name: "현대 스타리아 (법인)",
    category: "차량",
    acquisitionDate: "2022.10.20",
    acquisitionCost: 42_000_000,
    usefulLifeYears: 5,
    assignedTo: null,
    assignedTone: "primary",
    location: "지하주차장 B2",
    status: "사용중",
    yearsRemaining: 1.5,
  },
  {
    id: "5",
    assetNo: "IT-2023-028",
    name: "Dell UltraSharp 27",
    category: "IT기기",
    acquisitionDate: "2023.04.05",
    acquisitionCost: 650_000,
    usefulLifeYears: 5,
    assignedTo: "정지훈",
    assignedTone: "error",
    location: "서울 본사",
    status: "수리중",
    yearsRemaining: 2.0,
  },
  {
    id: "6",
    assetNo: "IT-2024-011",
    name: "ThinkPad X1 Carbon",
    category: "IT기기",
    acquisitionDate: "2024.02.14",
    acquisitionCost: 2_200_000,
    usefulLifeYears: 5,
    assignedTo: "강민준",
    assignedTone: "secondary",
    location: "서울 본사",
    status: "사용중",
    yearsRemaining: 2.9,
  },
];

const CATEGORY_ICON: Record<AssetCategory, typeof Package> = {
  IT기기: Laptop,
  사무가구: Sofa,
  차량: Car,
  기타: Package,
};

const STATUS_COLOR: Record<AssetStatus, string> = {
  사용중: "border-tertiary-sky/30 bg-tertiary-sky/10 text-tertiary-sky",
  수리중: "border-primary-electric/30 bg-primary-electric/10 text-primary-electric",
  폐기: "border-error-soft/30 bg-error-soft/10 text-error-soft",
  매각: "border-outline-variant/40 bg-surface-container text-on-surface-variant",
};

const EXPIRING = ASSETS.filter((a) => a.yearsRemaining <= 0.5);

function residualValue(a: Asset): number {
  const ratio = Math.max(0, a.yearsRemaining / a.usefulLifeYears);
  return Math.round(a.acquisitionCost * ratio);
}

const TOTAL_COST = ASSETS.reduce((s, a) => s + a.acquisitionCost, 0);
const TOTAL_RESIDUAL = ASSETS.reduce((s, a) => s + residualValue(a), 0);
const RESIDUAL_RATIO = TOTAL_COST > 0 ? TOTAL_RESIDUAL / TOTAL_COST : 0;

// 카테고리별 분포
const CATEGORY_GROUPS = (Object.keys(CATEGORY_ICON) as AssetCategory[])
  .map((cat) => {
    const items = ASSETS.filter((a) => a.category === cat);
    return {
      name: cat,
      count: items.length,
      cost: items.reduce((s, a) => s + a.acquisitionCost, 0),
    };
  })
  .filter((g) => g.count > 0);

const CATEGORY_TONE: Record<AssetCategory, string> = {
  IT기기: "bg-primary-electric",
  사무가구: "bg-tertiary-sky",
  차량: "bg-secondary-slate",
  기타: "bg-outline",
};

export default function AssetsPage() {
  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            자산 관리
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            고정자산 대장 · 정액법 감가상각 · 내용연수 추적
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg border border-outline-variant/50 bg-surface-container px-4 py-2 text-label-sm text-on-surface-variant opacity-60"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            내보내기
          </button>
          <button
            type="button"
            disabled
            className="inline-flex min-h-11 cursor-not-allowed items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary opacity-60"
          >
            <Plus aria-hidden className="h-[18px] w-[18px]" />
            자산 등록
          </button>
        </div>
      </div>

      {/* Top KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="총 자산"
          value={String(ASSETS.length)}
          unit="대"
          icon={Package}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth="100%"
        />
        <KPICard
          label="취득 총액"
          value={formatCompactKRW(TOTAL_COST)}
          icon={Coins}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth="80%"
        />
        <KPICard
          label="내용연수 임박"
          labelTone={EXPIRING.length > 0 ? "text-error-soft" : undefined}
          value={String(EXPIRING.length)}
          unit="건"
          valueTone={EXPIRING.length > 0 ? "text-error-soft" : undefined}
          icon={AlertTriangle}
          iconTone={
            EXPIRING.length > 0 ? "text-error-soft" : "text-on-surface-variant"
          }
          barTone={EXPIRING.length > 0 ? "bg-error-soft animate-pulse" : "bg-outline"}
          barWidth={EXPIRING.length > 0 ? "20%" : "0%"}
          glowText={EXPIRING.length > 0}
        />
      </div>

      {/* Bento */}
      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT 8col */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          {/* Filter */}
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-xl p-stack-md sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
                <input
                  type="search"
                  placeholder="자산명·자산번호 검색"
                  className="min-h-11 rounded-lg border border-outline-variant/40 bg-surface-container-low py-1.5 pl-9 pr-3 text-data-tabular text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
                />
              </div>
              <FilterSelect
                label="전체 분류"
                options={["전체 분류", "IT기기", "사무가구", "차량", "기타"]}
              />
              <FilterSelect
                label="상태"
                options={["상태", "사용중", "수리중", "폐기", "매각"]}
              />
            </div>
            <div className="text-label-sm text-on-surface-variant">
              {ASSETS.length}건
            </div>
          </div>

          {/* Table */}
          <div className="glass-panel overflow-x-auto rounded-xl">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="border-b border-outline-variant/20 bg-surface-container/30 text-label-sm text-on-surface-variant">
                <tr>
                  <th className="px-6 py-4 font-semibold">자산번호 · 분류</th>
                  <th className="px-6 py-4 font-semibold">자산명</th>
                  <th className="px-6 py-4 text-right font-semibold">취득가</th>
                  <th className="px-6 py-4 text-right font-semibold">잔여연수</th>
                  <th className="px-6 py-4 font-semibold">담당자</th>
                  <th className="px-6 py-4 text-center font-semibold">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/10 text-data-tabular text-on-surface">
                {ASSETS.map((a) => {
                  const CategoryIcon = CATEGORY_ICON[a.category];
                  const isExpiring = a.yearsRemaining <= 0.5;
                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        "group transition-colors hover:bg-surface-container/40",
                        isExpiring && "relative bg-error-soft/5 hover:bg-error-soft/10",
                      )}
                    >
                      <td
                        className={cn(
                          "px-6 py-3",
                          isExpiring && "relative pl-7",
                        )}
                      >
                        {isExpiring ? (
                          <span
                            aria-hidden
                            className="absolute left-0 top-0 h-full w-1 bg-error-soft opacity-70"
                          />
                        ) : null}
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-primary-electric/20 bg-primary-electric/10 text-primary-electric"
                          >
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-on-surface">{a.assetNo}</div>
                            <div className="text-xs text-on-surface-variant">
                              {a.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3">
                        <div className="font-medium text-on-surface">{a.name}</div>
                        <div className="text-xs text-on-surface-variant">{a.location}</div>
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums">
                        {formatKRW(a.acquisitionCost)}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span
                          className={cn(
                            "whitespace-nowrap tabular-nums",
                            a.yearsRemaining <= 0 || isExpiring
                              ? "text-error-soft"
                              : "text-on-surface",
                          )}
                        >
                          {formatRemainingYears(a.yearsRemaining)}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        {a.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <InitialsAvatar
                              name={a.assignedTo}
                              size="sm"
                              tone={a.assignedTone}
                            />
                            <span>{a.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant">공용</span>
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium",
                            STATUS_COLOR[a.status],
                          )}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT 4col */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* Asset Valuation */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <PackageCheck aria-hidden className="h-5 w-5 text-primary-electric" />
              자산 가치 평가
            </h3>

            <div className="space-y-4">
              <div>
                <div className="mb-1 text-label-sm text-on-surface-variant">취득 총액</div>
                <div className="text-[22px] font-semibold tabular-nums text-on-surface">
                  {formatKRW(TOTAL_COST)}
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-baseline justify-between">
                  <span className="text-label-sm text-on-surface-variant">
                    잔존가액 (정액법)
                  </span>
                  <span className="text-label-sm text-tertiary-sky">
                    {Math.round(RESIDUAL_RATIO * 100)}%
                  </span>
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-primary-electric">
                  {formatKRW(TOTAL_RESIDUAL)}
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                  <div
                    aria-hidden
                    className="h-full rounded-full bg-gradient-to-r from-primary-container to-primary-electric"
                    style={{ width: `${Math.round(RESIDUAL_RATIO * 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-label-sm text-on-surface-variant">
                  누적 감가 {formatKRW(TOTAL_COST - TOTAL_RESIDUAL)}
                </div>
              </div>
            </div>
          </div>

          {/* 카테고리 분포 */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <Package aria-hidden className="h-5 w-5 text-tertiary-sky" />
              분류별 구성
            </h3>
            <div className="space-y-4">
              {CATEGORY_GROUPS.map((g) => {
                const ratio = TOTAL_COST > 0 ? g.cost / TOTAL_COST : 0;
                const pct = Math.round(ratio * 100);
                const Icon = CATEGORY_ICON[g.name];
                return (
                  <div key={g.name}>
                    <div className="mb-1.5 flex items-center justify-between text-data-tabular">
                      <span className="flex items-center gap-2 text-on-surface">
                        <Icon aria-hidden className="h-3.5 w-3.5 text-on-surface-variant" />
                        {g.name}
                      </span>
                      <span className="text-on-surface-variant">
                        {g.count}대 · {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-container-highest">
                      <div
                        aria-hidden
                        className={cn("h-full rounded-full", CATEGORY_TONE[g.name])}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 내용연수 임박 */}
          <div className="glass-panel rounded-xl p-stack-md">
            <h3 className="mb-stack-md flex items-center gap-2 text-headline-md font-semibold text-on-surface">
              <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
              내용연수 임박
            </h3>
            <p className="mb-4 text-label-sm text-on-surface-variant">
              6개월 이내 만료 또는 이미 만료된 자산
            </p>
            {EXPIRING.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">해당 없음</p>
            ) : (
              <ul className="space-y-3">
                {EXPIRING.map((a) => {
                  const Icon = CATEGORY_ICON[a.category];
                  return (
                    <li
                      key={a.id}
                      className="flex items-start gap-3 rounded-lg border border-error-soft/20 bg-error-soft/5 p-3"
                    >
                      <div
                        aria-hidden
                        className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-error-soft/10 text-error-soft"
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-data-tabular font-medium text-on-surface">
                          {a.name}
                        </div>
                        <div className="text-label-sm text-error-soft">
                          {a.yearsRemaining <= 0
                            ? `${formatRemainingYears(Math.abs(a.yearsRemaining))} 초과`
                            : `${formatRemainingYears(a.yearsRemaining)} 남음`}
                          {" · "}
                          <span className="text-on-surface-variant">{a.assetNo}</span>
                        </div>
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

function FilterSelect({ label, options }: { label: string; options: string[] }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        className="min-h-11 appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-outline"
      />
    </div>
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

function formatCompactKRW(n: number): string {
  // 한국형 억·만
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1)}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000)}만`;
  return n.toLocaleString("ko-KR");
}
