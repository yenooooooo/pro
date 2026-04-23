import {
  AlertTriangle,
  Building2,
  Download,
  Handshake,
  Mail,
  Phone,
  Search,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Vendor = {
  id: string;
  name: string;
  businessNo: string;
  contact: string;
  phone: string;
  email: string;
  contractStart: string;
  contractEnd: string;
  category: "파트너" | "공급사" | "고객사";
  daysToExpiry: number;
};

// Phase 5.2에서 vendors 조회로 교체.
const VENDORS: Vendor[] = [
  {
    id: "1",
    name: "주식회사 네오비트",
    businessNo: "123-45-67890",
    contact: "김지훈",
    phone: "02-555-1234",
    email: "kim@neobit.co.kr",
    contractStart: "2024.05.01",
    contractEnd: "2026.04.30",
    category: "파트너",
    daysToExpiry: 7,
  },
  {
    id: "2",
    name: "강남빌딩관리",
    businessNo: "234-56-78901",
    contact: "박지성",
    phone: "02-333-5678",
    email: "contract@gnbldg.kr",
    contractStart: "2023.01.01",
    contractEnd: "2026.12.31",
    category: "공급사",
    daysToExpiry: 252,
  },
  {
    id: "3",
    name: "코어플러스피트니스",
    businessNo: "345-67-89012",
    contact: "이소영",
    phone: "02-444-9876",
    email: "admin@coreplus.kr",
    contractStart: "2025.01.01",
    contractEnd: "2026.05.31",
    category: "공급사",
    daysToExpiry: 38,
  },
  {
    id: "4",
    name: "프라임러닝",
    businessNo: "456-78-90123",
    contact: "정재현",
    phone: "02-111-2233",
    email: "team@primelearning.kr",
    contractStart: "2025.06.01",
    contractEnd: "2027.05.31",
    category: "파트너",
    daysToExpiry: 403,
  },
  {
    id: "5",
    name: "A사",
    businessNo: "567-89-01234",
    contact: "최영희",
    phone: "031-999-8888",
    email: "contact@a-corp.kr",
    contractStart: "2024.03.01",
    contractEnd: "2026.05.15",
    category: "고객사",
    daysToExpiry: 22,
  },
  {
    id: "6",
    name: "오피스디포",
    businessNo: "678-90-12345",
    contact: "박수진",
    phone: "1588-0000",
    email: "b2b@officedepo.kr",
    contractStart: "2024.11.01",
    contractEnd: "2027.10.31",
    category: "공급사",
    daysToExpiry: 556,
  },
];

const FILTERS: { label: string; active: boolean }[] = [
  { label: "전체", active: true },
  { label: "파트너", active: false },
  { label: "공급사", active: false },
  { label: "고객사", active: false },
];

const EXPIRING_SOON = VENDORS.filter((v) => v.daysToExpiry <= 30).sort(
  (a, b) => a.daysToExpiry - b.daysToExpiry,
);

const CATEGORY_COLOR: Record<Vendor["category"], string> = {
  파트너: "border-primary-container/30 bg-primary-container/10 text-primary-electric",
  공급사: "border-tertiary-container/30 bg-tertiary-container/20 text-tertiary-sky",
  고객사: "border-secondary-container/50 bg-secondary-container/30 text-secondary-slate",
};

export default function VendorsPage() {
  return (
    <div className="space-y-stack-lg">
      {/* Page header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="mb-2 text-headline-lg font-semibold tracking-tight text-on-surface">
            Vendor Network
          </h2>
          <p className="text-body-md text-on-surface-variant">
            거래처 마스터 · 계약 갱신 알림
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
            className="inline-flex min-h-11 items-center gap-2 rounded bg-inverse-primary px-6 py-3 text-label-sm font-semibold text-on-primary shadow-[0_0_20px_rgba(73,75,214,0.3)] transition-colors hover:bg-primary-container"
          >
            <Handshake aria-hidden className="h-[18px] w-[18px]" />
            거래처 추가
          </button>
        </div>
      </div>

      {/* 계약 만료 임박 배너 */}
      {EXPIRING_SOON.length > 0 ? (
        <div className="glass-panel flex items-center gap-4 rounded-xl border-l-4 border-l-error-soft bg-error-soft/5 p-4">
          <AlertTriangle aria-hidden className="h-6 w-6 flex-shrink-0 text-error-soft" />
          <div className="flex-1">
            <p className="text-body-md font-medium text-on-surface">
              계약 만료 임박 거래처 {EXPIRING_SOON.length}건
            </p>
            <p className="mt-0.5 text-label-sm text-on-surface-variant">
              30일 이내 만료 예정 · 갱신 여부 확인이 필요합니다
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {EXPIRING_SOON.map((v) => (
              <span
                key={v.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-error-container/50 bg-error-container/20 px-3 py-1 text-[11px] font-semibold text-error-soft"
              >
                {v.name} · D-{v.daysToExpiry}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
          />
          <input
            type="search"
            placeholder="거래처·담당자·사업자번호 검색"
            className="min-h-11 w-full rounded-lg border border-outline-variant/50 bg-surface-container-low py-2 pl-10 pr-4 text-body-md text-on-surface shadow-inner placeholder:text-outline focus:border-inverse-primary focus:outline-none focus:ring-1 focus:ring-inverse-primary"
          />
        </div>
        {FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            className={cn(
              "min-h-11 rounded-full px-4 text-label-sm transition-colors",
              f.active
                ? "border border-outline-variant bg-surface-container-highest text-on-surface"
                : "border border-outline-variant/50 bg-surface-container text-on-surface-variant hover:border-outline-variant",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* 카드 그리드 */}
      <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2 xl:grid-cols-3">
        {VENDORS.map((v) => (
          <VendorCard key={v.id} vendor={v} />
        ))}
      </div>
    </div>
  );
}

function VendorCard({ vendor }: { vendor: Vendor }) {
  const isExpiringSoon = vendor.daysToExpiry <= 30;
  return (
    <div
      className={cn(
        "glass-panel group relative flex cursor-pointer flex-col gap-stack-sm overflow-hidden rounded-xl p-stack-md transition-colors",
        isExpiringSoon
          ? "border-l-4 border-l-error-soft hover:bg-surface-container/80"
          : "hover:bg-surface-container/80",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="flex items-start justify-between">
        <div
          aria-hidden
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high text-primary-electric"
        >
          <Building2 className="h-5 w-5" />
        </div>
        <span
          className={cn(
            "rounded-md border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
            CATEGORY_COLOR[vendor.category],
          )}
        >
          {vendor.category}
        </span>
      </div>

      <div className="mt-2">
        <h3 className="text-body-lg font-semibold text-on-surface transition-colors group-hover:text-inverse-primary">
          {vendor.name}
        </h3>
        <p className="text-label-sm tabular-nums text-on-surface-variant">
          사업자 {vendor.businessNo}
        </p>
      </div>

      <div className="mt-2 space-y-1.5 text-data-tabular text-on-surface-variant">
        <div className="flex items-center gap-2">
          <User aria-hidden className="h-[14px] w-[14px] text-outline" />
          {vendor.contact}
        </div>
        <div className="flex items-center gap-2">
          <Phone aria-hidden className="h-[14px] w-[14px] text-outline" />
          <span className="tabular-nums">{vendor.phone}</span>
        </div>
        <div className="flex items-center gap-2 truncate">
          <Mail aria-hidden className="h-[14px] w-[14px] text-outline" />
          <span className="truncate">{vendor.email}</span>
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <div className="text-label-sm tabular-nums text-outline">
          {vendor.contractStart} ~ {vendor.contractEnd}
        </div>
        {isExpiringSoon ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-error-container/50 bg-error-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-error-soft">
            <AlertTriangle aria-hidden className="h-3 w-3" />D-{vendor.daysToExpiry}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary-container/50 bg-primary-container/20 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary-container">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary-container" />
            유효
          </span>
        )}
      </div>
    </div>
  );
}
