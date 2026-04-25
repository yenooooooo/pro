import {
  AlertTriangle,
  Car,
  ChevronDown,
  Download,
  Laptop,
  Package,
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
  yearsRemaining: number; // 내용연수 잔여 (년)
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
    yearsRemaining: 0.05, // 2026.04.23 기준 약 18일
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
    yearsRemaining: -0.2, // 이미 내용연수 만료
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
  사용중: "border-primary-container/50 bg-primary-container/20 text-primary-container",
  수리중: "border-tertiary-container/50 bg-tertiary-container/20 text-tertiary-sky",
  폐기: "border-error-container/50 bg-error-container/20 text-error-soft",
  매각: "border-outline-variant/50 bg-surface-variant text-on-surface-variant",
};

// 내용연수 만료 6개월 이내(0.5년 이하) 또는 이미 만료 — 경고 대상
const EXPIRING = ASSETS.filter((a) => a.yearsRemaining <= 0.5);

// 정액법 감가상각 잔존가 계산: 취득가 × max(0, 잔여연수/내용연수)
function residualValue(a: Asset): number {
  const ratio = Math.max(0, a.yearsRemaining / a.usefulLifeYears);
  return Math.round(a.acquisitionCost * ratio);
}

const TOTAL_COST = ASSETS.reduce((s, a) => s + a.acquisitionCost, 0);
const TOTAL_RESIDUAL = ASSETS.reduce((s, a) => s + residualValue(a), 0);

export default function AssetsPage() {
  return (
    <div className="space-y-stack-lg">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
            Asset Registry
          </h2>
          <p className="text-body-md text-on-surface-variant">
            고정자산 대장 · 정액법 감가상각 · 내용연수 추적
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded border border-outline-variant/50 bg-surface-container-high px-4 py-2 text-label-sm text-on-surface transition-colors hover:bg-surface-container-highest"
          >
            <Download aria-hidden className="h-[18px] w-[18px]" />
            내보내기
          </button>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-2 rounded bg-gradient-to-b from-primary-electric to-inverse-primary px-6 py-2 text-label-sm font-semibold text-on-primary shadow-[0_0_15px_rgba(192,193,255,0.3)] transition-opacity hover:opacity-90"
          >
            <Plus aria-hidden className="h-[18px] w-[18px]" />
            자산 등록
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        {/* LEFT: 필터 + 테이블 */}
        <div className="col-span-12 flex flex-col gap-stack-md xl:col-span-8">
          <div className="glass-panel flex flex-col items-start justify-between gap-3 rounded-lg bg-surface-container-low p-4 sm:flex-row sm:items-center">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search
                  aria-hidden
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
                />
                <input
                  type="search"
                  placeholder="자산명·자산번호 검색"
                  className="min-h-11 rounded border border-outline-variant/40 bg-surface py-1.5 pl-9 pr-3 text-data-tabular text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
                />
              </div>
              <FilterSelect
                label="전체 분류"
                options={["전체 분류", "IT기기", "사무가구", "차량", "기타"]}
              />
              <FilterSelect label="상태" options={["상태", "사용중", "수리중", "폐기", "매각"]} />
            </div>
            <div className="text-label-sm text-outline-variant">
              {ASSETS.length}건
            </div>
          </div>

          <div className="glass-panel overflow-x-auto rounded-lg bg-surface-container-lowest">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead className="border-b border-outline-variant/30 bg-surface-container-low text-label-sm text-on-surface-variant">
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
                        "group transition-colors hover:bg-primary-electric/5",
                        isExpiring && "border-l-2 border-l-error-soft bg-error-soft/5",
                      )}
                    >
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            aria-hidden
                            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-primary-electric/10 text-primary-electric"
                          >
                            <CategoryIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-on-surface">{a.assetNo}</div>
                            <div className="text-xs text-on-surface-variant">{a.category}</div>
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
                            "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] font-semibold",
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

        {/* RIGHT: 감가상각 요약 + 만료 임박 */}
        <div className="col-span-12 flex flex-col gap-stack-lg xl:col-span-4">
          {/* 감가상각 요약 */}
          <div className="glass-panel relative overflow-hidden rounded-xl bg-surface-container p-6">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary-electric/20 blur-2xl"
            />
            <div className="mb-6 flex items-center gap-2">
              <Package aria-hidden className="h-5 w-5 text-primary-electric" />
              <h3 className="text-[18px] font-semibold text-white">Asset Valuation</h3>
            </div>
            <div className="space-y-4">
              <div>
                <div className="mb-1 text-label-sm font-medium text-on-surface-variant">
                  취득 총액
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-white">
                  {formatKRW(TOTAL_COST)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-label-sm font-medium text-on-surface-variant">
                  잔존가액 (정액법)
                </div>
                <div className="text-[22px] font-semibold tabular-nums text-primary-electric">
                  {formatKRW(TOTAL_RESIDUAL)}
                </div>
                <div className="mt-1 text-label-sm text-on-surface-variant">
                  누적 감가 {formatKRW(TOTAL_COST - TOTAL_RESIDUAL)}
                </div>
              </div>
            </div>
          </div>

          {/* 내용연수 만료 임박 */}
          <div className="glass-panel rounded-xl bg-surface-container p-6">
            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle aria-hidden className="h-5 w-5 text-error-soft" />
              <h3 className="text-[18px] font-semibold text-white">내용연수 임박</h3>
            </div>
            <p className="mb-4 text-label-sm text-on-surface-variant">
              6개월 이내 만료 또는 이미 만료된 자산
            </p>
            {EXPIRING.length === 0 ? (
              <p className="text-body-md text-on-surface-variant">해당 없음</p>
            ) : (
              <ul className="space-y-3">
                {EXPIRING.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start gap-3 rounded-lg border border-error-container/30 bg-error-soft/5 p-3"
                  >
                    <div
                      aria-hidden
                      className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-error-soft/10 text-error-soft"
                    >
                      {(() => {
                        const Icon = CATEGORY_ICON[a.category];
                        return <Icon className="h-4 w-4" />;
                      })()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-body-md font-medium text-on-surface">{a.name}</div>
                      <div className="text-label-sm text-error-soft">
                        {a.yearsRemaining <= 0
                          ? `${formatRemainingYears(Math.abs(a.yearsRemaining))} 초과`
                          : `${formatRemainingYears(a.yearsRemaining)} 남음`}
                        {" · "}
                        <span className="text-on-surface-variant">{a.assetNo}</span>
                      </div>
                    </div>
                  </li>
                ))}
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
        className="min-h-11 appearance-none rounded border border-outline-variant/40 bg-surface px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
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
