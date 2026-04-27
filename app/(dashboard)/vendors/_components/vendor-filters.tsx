"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Props = {
  q: string;
  category: string | null;
  categories: string[];
};

export function VendorFilters({ q, category, categories }: Props) {
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
      <form onSubmit={onSearchSubmit} className="relative w-full max-w-sm flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-outline"
        />
        <input
          name="q"
          type="search"
          defaultValue={q}
          placeholder="거래처·담당자·사업자번호 검색"
          className="min-h-11 w-full rounded-lg border border-outline-variant/40 bg-surface-container-low py-2 pl-10 pr-4 text-data-tabular text-on-surface shadow-inner placeholder:text-outline focus:border-primary-electric focus:outline-none focus:ring-1 focus:ring-primary-electric"
        />
      </form>
      <div className="flex flex-wrap gap-2">
        <CategoryPill
          label="전체"
          active={category === null}
          onClick={() => setParam("category", null)}
        />
        {categories.map((c) => (
          <CategoryPill
            key={c}
            label={c}
            active={category === c}
            onClick={() => setParam("category", c)}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-full px-4 text-label-sm transition-colors",
        active
          ? "border border-primary-electric/40 bg-primary-electric/10 text-primary-electric"
          : "border border-outline-variant/50 bg-surface-container text-on-surface-variant hover:border-outline-variant",
      )}
    >
      {label}
    </button>
  );
}
