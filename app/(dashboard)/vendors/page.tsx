import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FileSignature,
  Handshake,
  Mail,
  Phone,
  Plus,
  User,
} from "lucide-react";
import { differenceInDays } from "date-fns";
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

  return (
    <div className="space-y-stack-lg">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-headline-lg font-semibold tracking-tight text-on-surface">
            거래처 관리
          </h2>
          <p className="mt-1 text-body-md text-on-surface-variant">
            거래처 마스터 · 계약 갱신 알림 · 카테고리별 분류 · {decorated.length}건
          </p>
        </div>
        <Link
          href="/vendors/new"
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary-electric px-4 py-2 text-label-sm font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          <Plus aria-hidden className="h-[18px] w-[18px]" />
          거래처 추가
        </Link>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-gutter md:grid-cols-3">
        <KPICard
          label="총 거래처"
          value={String(decorated.length)}
          unit="개"
          icon={Handshake}
          iconTone="text-primary-electric"
          barTone="bg-primary-electric"
          barWidth="100%"
        />
        <KPICard
          label="활성 계약"
          value={String(activeCount)}
          unit="개"
          icon={CheckCircle2}
          iconTone="text-tertiary-sky"
          barTone="bg-tertiary-sky"
          barWidth={
            decorated.length > 0
              ? `${Math.round((activeCount / decorated.length) * 100)}%`
              : "0%"
          }
        />
        <KPICard
          label={`만료 임박 (${EXPIRY_THRESHOLD_DAYS}일)`}
          labelTone={expiringSoon.length > 0 ? "text-error-soft" : undefined}
          value={String(expiringSoon.length)}
          unit="건"
          valueTone={expiringSoon.length > 0 ? "text-error-soft" : undefined}
          icon={Clock}
          iconTone={
            expiringSoon.length > 0 ? "text-error-soft" : "text-on-surface-variant"
          }
          barTone={
            expiringSoon.length > 0 ? "bg-error-soft animate-pulse" : "bg-outline"
          }
          barWidth={expiringSoon.length > 0 ? "20%" : "0%"}
          glowText={expiringSoon.length > 0}
        />
      </div>

      {/* 만료 임박/만료 배너 */}
      {expiringSoon.length > 0 || expired.length > 0 ? (
        <ExpiryBanner expiringSoon={expiringSoon} expired={expired} />
      ) : null}

      {/* Filter Bar */}
      <div className="glass-panel rounded-xl p-stack-md">
        <VendorFilters q={q} category={category} categories={categories} />
      </div>

      {/* Card grid */}
      {decorated.length === 0 ? (
        <div className="glass-panel rounded-xl p-12 text-center">
          <Building2 aria-hidden className="mx-auto h-10 w-10 text-outline-variant" />
          <p className="mt-3 text-body-md text-on-surface-variant">
            {q || category
              ? "조건에 일치하는 거래처가 없습니다."
              : "등록된 거래처가 없습니다. 우측 상단 「거래처 추가」를 눌러 시작하세요."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-stack-md md:grid-cols-2 xl:grid-cols-3">
          {decorated.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
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
    <div className="glass-panel relative overflow-hidden rounded-xl border-l-4 border-l-error-soft p-stack-md">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-error-soft/10 to-transparent"
      />
      <div className="relative flex flex-wrap items-center gap-4">
        <AlertTriangle aria-hidden className="h-6 w-6 flex-shrink-0 text-error-soft" />
        <div className="flex-1">
          <p className="text-body-md font-medium text-on-surface">
            계약 갱신 검토 필요
            {expiringSoon.length > 0 ? ` · 임박 ${expiringSoon.length}건` : ""}
            {expired.length > 0 ? ` · 만료 ${expired.length}건` : ""}
          </p>
          <p className="mt-0.5 text-label-sm text-on-surface-variant">
            {EXPIRY_THRESHOLD_DAYS}일 이내 만료 예정 또는 이미 만료된 계약을 검토하세요.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {[...expired, ...expiringSoon].slice(0, 6).map((v) => (
            <Link
              key={v.id}
              href={`/vendors/${v.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-md border border-error-soft/30 bg-error-soft/10 px-3 py-1 text-label-sm font-semibold text-error-soft transition-colors hover:bg-error-soft/20"
            >
              {v.name} ·{" "}
              {v.daysToExpiry !== null && v.daysToExpiry < 0
                ? `만료 ${-v.daysToExpiry}일 경과`
                : `D-${v.daysToExpiry}`}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function VendorCard({ vendor }: { vendor: DecoratedVendor }) {
  const isExpiringSoon =
    vendor.daysToExpiry !== null &&
    vendor.daysToExpiry >= 0 &&
    vendor.daysToExpiry <= EXPIRY_THRESHOLD_DAYS;
  const isExpired = vendor.daysToExpiry !== null && vendor.daysToExpiry < 0;
  return (
    <Link
      href={`/vendors/${vendor.id}/edit`}
      className={cn(
        "glass-panel group relative flex cursor-pointer flex-col gap-stack-sm overflow-hidden rounded-xl p-stack-md transition-all",
        isExpired
          ? "border-l-4 border-l-error-soft hover:bg-error-soft/5"
          : isExpiringSoon
            ? "border-l-4 border-l-error-soft hover:bg-surface-container/80"
            : "hover:border-primary-electric/30 hover:bg-surface-container/80",
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100"
      />

      <div className="relative flex items-start justify-between">
        <div
          aria-hidden
          className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-outline-variant/30 bg-surface-container-high text-primary-electric"
        >
          <Building2 className="h-5 w-5" />
        </div>
        {vendor.category ? (
          <span className="inline-flex whitespace-nowrap rounded-md border border-primary-electric/30 bg-primary-electric/10 px-2.5 py-1 text-[11px] font-semibold text-primary-electric">
            {label(VENDOR_CATEGORY_LABEL, vendor.category)}
          </span>
        ) : null}
      </div>

      <div className="relative mt-2">
        <h3 className="text-body-lg font-semibold text-on-surface transition-colors group-hover:text-primary-electric">
          {vendor.name}
        </h3>
        {vendor.business_no ? (
          <p className="text-label-sm tabular-nums text-on-surface-variant">
            사업자 {vendor.business_no}
          </p>
        ) : null}
      </div>

      <div className="relative mt-2 space-y-1.5 text-data-tabular text-on-surface-variant">
        {vendor.contact_person ? (
          <div className="flex items-center gap-2">
            <User aria-hidden className="h-[14px] w-[14px] text-outline" />
            {vendor.contact_person}
          </div>
        ) : null}
        {vendor.phone ? (
          <div className="flex items-center gap-2">
            <Phone aria-hidden className="h-[14px] w-[14px] text-outline" />
            <span className="tabular-nums">{vendor.phone}</span>
          </div>
        ) : null}
        {vendor.email ? (
          <div className="flex items-center gap-2 truncate">
            <Mail aria-hidden className="h-[14px] w-[14px] text-outline" />
            <span className="truncate">{vendor.email}</span>
          </div>
        ) : null}
      </div>

      <div className="relative mt-auto flex items-center justify-between border-t border-outline-variant/20 pt-4">
        <div className="flex items-center gap-1.5 text-label-sm tabular-nums text-outline">
          <FileSignature aria-hidden className="h-3.5 w-3.5" />
          <span className="truncate">{vendor.contractRange}</span>
        </div>
        {isExpired ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-error-soft/30 bg-error-soft/10 px-2 py-1 text-[11px] font-semibold text-error-soft">
            <AlertTriangle aria-hidden className="h-3 w-3" />
            만료 {-(vendor.daysToExpiry as number)}일
          </span>
        ) : isExpiringSoon ? (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-error-soft/30 bg-error-soft/10 px-2 py-1 text-[11px] font-semibold text-error-soft">
            <AlertTriangle aria-hidden className="h-3 w-3" />
            D-{vendor.daysToExpiry}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md border border-tertiary-sky/30 bg-tertiary-sky/10 px-2 py-1 text-[11px] font-semibold text-tertiary-sky">
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-tertiary-sky" />
            유효
          </span>
        )}
      </div>
    </Link>
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
  icon: typeof Handshake;
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
