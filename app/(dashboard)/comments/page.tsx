import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type CommentRow = {
  id: string;
  entity_type: string;
  entity_id: string;
  author_email: string;
  body: string;
  mentions: string[];
  created_at: string;
  edited_at: string | null;
};

const ENTITY_LABEL: Record<string, { label: string; tone: "ok" | "pend" | "rej" | "info" | "" }> = {
  approval_request: { label: "결재", tone: "info" },
  expense: { label: "지출", tone: "pend" },
  asset: { label: "자산", tone: "" },
  employee: { label: "직원", tone: "ok" },
  vendor: { label: "거래처", tone: "info" },
  leave_request: { label: "휴가", tone: "pend" },
  closing_history: { label: "결산", tone: "rej" },
};

const ENTITY_HREF: Record<string, (id: string) => string> = {
  approval_request: (id) => `/approvals/${id}`,
  expense: (id) => `/expenses/${id}/edit`,
  asset: (id) => `/assets/${id}/edit`,
  employee: (id) => `/employees/${id}`,
  vendor: (id) => `/vendors/${id}/edit`,
  leave_request: (id) => `/leave?id=${id}`,
  closing_history: () => `/closing`,
};

export default async function CommentsPage() {
  const t = await getTranslations("comments");
  const supabase = createClient();

  const { data, error } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("comments" as any)
    .select(
      "id, entity_type, entity_id, author_email, body, mentions, created_at, edited_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as CommentRow[];

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M22</b>System · Comments
          </div>
          <h1 className="page-h">
            코멘트 <em>모음.</em>
          </h1>
          <p className="page-sub">{t("subtitle")}</p>
        </div>
      </header>

      {error && (
        <div className="mb-6 border border-line bg-bg-1 p-4 font-mono text-[12px] text-[#E06B5F]">
          코멘트 조회 실패: {error.message}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="border border-line bg-bg-1/40 py-16 text-center">
          <p className="font-serif text-[22px] italic text-text-2">
            아직 코멘트가 없습니다.
          </p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            첫 의견을 남겨 협업을 시작해 보세요
          </p>
        </div>
      ) : (
        <section className="panel border border-line">
          <div className="panel-h">
            <div className="t font-serif">
              최근 <em>{rows.length}건</em>
            </div>
            <div className="meta">Recent threads</div>
          </div>
          <ul className="flex flex-col">
            {rows.map((c) => {
              const meta = ENTITY_LABEL[c.entity_type] ?? {
                label: c.entity_type,
                tone: "" as const,
              };
              const chipClass = meta.tone ? `chip ${meta.tone}` : "chip";
              const hrefFn = ENTITY_HREF[c.entity_type];
              const href = hrefFn ? hrefFn(c.entity_id) : null;

              const inner = (
                <li
                  className={`flex flex-col gap-2 border-b border-line py-5 last:border-b-0 ${
                    href ? "transition-colors hover:bg-bg-1" : ""
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={chipClass}>
                      <i />
                      {meta.label}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-text-2">
                      {c.author_email}
                    </span>
                    <span className="ml-auto font-mono text-[10px] tracking-[0.05em] text-text-3">
                      {formatTime(c.created_at)}
                      {c.edited_at ? " · 수정됨" : ""}
                    </span>
                  </div>
                  <p className="font-serif text-[18px] leading-[1.55] text-text-1">
                    {c.body}
                  </p>
                  {c.mentions && c.mentions.length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.mentions.map((m) => (
                        <span
                          key={m}
                          className="font-mono text-[10px] uppercase tracking-[0.05em] text-gold"
                        >
                          @{m}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </li>
              );

              return href ? (
                <Link key={c.id} href={href as never}>
                  {inner}
                </Link>
              ) : (
                <div key={c.id}>{inner}</div>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}.${mm}.${dd} ${hh}:${mi}`;
}
