"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Search } from "lucide-react";
import {
  ASSET_CATEGORY_LABEL,
  ASSET_STATUS_LABEL,
  label,
} from "@/lib/labels";

type Option = { value: string; label: string };

type Props = {
  q: string;
  category: string | null;
  status: string | null;
  categories: string[];
  statuses: string[];
};

export function AssetFilters({ q, category, status, categories, statuses }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") params.delete(key);
    else params.set(key, value);
    router.push(`?${params.toString()}`);
  }

  function onSearchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const value = String(fd.get("q") ?? "").trim();
    setParam("q", value || null);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <form onSubmit={onSearchSubmit} className="relative">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-outline"
        />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="자산명·자산번호 검색"
          className="min-h-11 rounded-lg border border-outline-variant/40 bg-surface-container-low py-1.5 pl-9 pr-3 text-data-tabular text-on-surface placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
        />
      </form>
      <Select
        ariaLabel="분류"
        value={category ?? ""}
        onChange={(v) => setParam("category", v || null)}
        options={[
          { value: "", label: "전체 분류" },
          ...categories.map((c) => ({
            value: c,
            label: label(ASSET_CATEGORY_LABEL, c),
          })),
        ]}
      />
      <Select
        ariaLabel="상태"
        value={status ?? ""}
        onChange={(v) => setParam("status", v || null)}
        options={[
          { value: "", label: "전체 상태" },
          ...statuses.map((s) => ({
            value: s,
            label: label(ASSET_STATUS_LABEL, s),
          })),
        ]}
      />
    </div>
  );
}

function Select({
  ariaLabel,
  value,
  onChange,
  options,
}: {
  ariaLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
}) {
  return (
    <div className="relative">
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-11 appearance-none rounded-lg border border-outline-variant/40 bg-surface-container-low px-3 pr-8 text-data-tabular text-on-surface outline-none focus:border-primary-electric focus:ring-1 focus:ring-primary-electric"
      >
        {options.map((o) => (
          <option key={o.value || "_empty"} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-outline"
      />
    </div>
  );
}
