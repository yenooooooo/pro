import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type BookmarkRow = {
  id: string;
  user_id: string;
  kind: "page" | "employee" | "vendor";
  target: string;
  label: string;
  icon: string | null;
  created_at: string;
};

const KIND_META: Record<
  "page" | "employee" | "vendor",
  { label: string; tone: "ok" | "pend" | "info"; title: string }
> = {
  page: { label: "PAGE", tone: "info", title: "페이지" },
  employee: { label: "EMPLOYEE", tone: "ok", title: "직원" },
  vendor: { label: "VENDOR", tone: "pend", title: "거래처" },
};

function resolveHref(b: BookmarkRow): string {
  if (b.kind === "page") return b.target;
  if (b.kind === "employee") return `/employees/${b.target}`;
  return `/vendors/${b.target}/edit`;
}

export default async function BookmarksPage() {
  const t = await getTranslations("bookmarks");
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data, error } = user
    ? await supabase
        .schema("chongmu")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .from("bookmarks" as any)
        .select("id, user_id, kind, target, label, icon, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
    : { data: [], error: null };

  const rows = (data ?? []) as unknown as BookmarkRow[];

  // kind 별 그룹화
  const groups: Record<"page" | "employee" | "vendor", BookmarkRow[]> = {
    page: [],
    employee: [],
    vendor: [],
  };
  for (const b of rows) {
    if (b.kind in groups) groups[b.kind].push(b);
  }

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M23</b>System · Bookmarks
          </div>
          <h1 className="page-h">
            즐겨 <em>찾기.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 border border-line bg-bg-1 p-4 font-mono text-[12px] text-[#E06B5F]">
          즐겨찾기 조회 실패: {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="border border-line bg-bg-1/40 py-16 text-center">
          <p className="font-serif text-[22px] italic text-text-2">
            아직 즐겨찾기가 없습니다.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            자주 보는 항목을 핀으로 고정해 보세요
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-9">
          {(["page", "employee", "vendor"] as const).map((kind) => {
            const items = groups[kind];
            if (items.length === 0) return null;
            const meta = KIND_META[kind];
            return (
              <section key={kind} className="panel border border-line">
                <div className="panel-h">
                  <div className="t font-serif">
                    {meta.title} <em>{items.length}.</em>
                  </div>
                  <div className="meta">{meta.label}</div>
                </div>
                <ul className="flex flex-col">
                  {items.map((b) => {
                    const href = resolveHref(b);
                    return (
                      <li key={b.id} className="border-b border-line last:border-b-0">
                        <Link
                          href={href as never}
                          className="flex items-center gap-4 py-4 transition-colors hover:bg-bg-1"
                        >
                          <span className={`chip ${meta.tone}`}>
                            <i />
                            {meta.label}
                          </span>
                          <span className="flex-1 truncate font-serif text-[18px] italic text-text-1">
                            {b.label}
                          </span>
                          <span className="font-mono text-[11px] tracking-[0.05em] text-text-3">
                            {b.target}
                          </span>
                          <span className="font-mono text-[14px] text-gold transition-transform group-hover:translate-x-1">
                            →
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
