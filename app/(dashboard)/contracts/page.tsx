import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils/cn";
import { createClient } from "@/lib/supabase/server";
import { differenceInDays } from "date-fns";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  service: "용역",
  supply: "공급",
  lease: "임대차",
  employment: "근로",
  nda: "비밀유지",
  other: "기타",
};

const STATUS_LABEL: Record<string, string> = {
  active: "유효",
  expired: "만료",
  terminated: "해지",
  draft: "작성중",
};

type Contract = {
  id: string;
  title: string;
  contract_type: string | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string;
  vendors: { id: string; name: string } | null;
};

export default async function ContractsPage() {
  const supabase = createClient();
  const { data: rows } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("contracts" as any)
    .select(
      "id, title, contract_type, amount, start_date, end_date, status, vendors:vendor_id(id, name)",
    )
    .order("end_date", { ascending: true, nullsFirst: false })
    .returns<Contract[]>();

  const today = new Date();
  const contracts = (rows ?? []).map((c) => ({
    ...c,
    daysToExpiry: c.end_date ? differenceInDays(new Date(c.end_date), today) : null,
  }));

  const totalCount = contracts.length;
  const activeCount = contracts.filter((c) => c.status === "active").length;
  const expiringSoon = contracts.filter(
    (c) =>
      c.daysToExpiry !== null && c.daysToExpiry >= 0 && c.daysToExpiry <= 30,
  );
  const expired = contracts.filter(
    (c) => c.daysToExpiry !== null && c.daysToExpiry < 0,
  );

  const t = await getTranslations("contracts");

  return (
    <div className="animate-view-in">
      {/* ===== Page Head ===== */}
      <header className="mb-9 flex flex-col items-start justify-between gap-8 border-b border-line pb-6 sm:flex-row sm:items-end">
        <div>
          <div className="eyebrow mb-3">
            <b>M07</b>Records · Contracts
          </div>
          <h1 className="page-h">
            계약 <em>관리.</em>
          </h1>
          <p className="page-sub">
            {t("title")} · 계약서 PDF/이미지를 업로드하면 AI가 만료일·당사자·금액을
            자동 추출합니다. 만료 30일 전 자동 알림.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={"/contracts/new" as never} className="btn btn-primary">
            + 계약 추가
          </Link>
        </div>
      </header>

      {/* ===== KPIs ===== */}
      <div className="mb-9 grid grid-cols-1 border-l border-t border-line sm:grid-cols-2 xl:grid-cols-4">
        <KPI label="총 계약" value={totalCount.toLocaleString("ko-KR")} suffix="건" />
        <KPI
          label="유효"
          value={activeCount.toLocaleString("ko-KR")}
          suffix="건"
          subtext={`전체 ${totalCount}건 중`}
        />
        <KPI
          label="만료 임박"
          value={expiringSoon.length.toLocaleString("ko-KR")}
          suffix="건"
          tone={expiringSoon.length > 0 ? "warn" : "default"}
          subtext={expiringSoon.length > 0 ? "30일 이내" : "이상 없음"}
        />
        <KPI
          label="만료됨"
          value={expired.length.toLocaleString("ko-KR")}
          suffix="건"
          tone={expired.length > 0 ? "danger" : "default"}
          subtext={expired.length > 0 ? "갱신/해지 처리 필요" : "이상 없음"}
        />
      </div>

      {/* ===== Contracts Table ===== */}
      <section className="panel mb-9 border border-line">
        <div className="panel-h">
          <div className="t font-serif">
            계약 <em>목록</em>
          </div>
          <div className="meta">{totalCount}건</div>
        </div>
        {contracts.length === 0 ? (
          <div className="border border-line bg-bg-1/40 py-12 text-center font-mono text-[11px] uppercase tracking-[0.08em] text-text-3">
            등록된 계약서가 없습니다. 계약서 PDF/이미지를 업로드하면 AI가 자동으로
            항목을 추출합니다.
          </div>
        ) : (
          <div className="w-full overflow-x-auto">
            <table className="tbl min-w-[960px]">
              <thead>
                <tr>
                  <th>유형</th>
                  <th>제목</th>
                  <th>거래처</th>
                  <th className="text-right">금액</th>
                  <th>시작일</th>
                  <th>종료일</th>
                  <th className="text-right">D-day</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => (
                  <ContractRow key={c.id} contract={c} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

type DecoratedContract = Contract & { daysToExpiry: number | null };

function statusChipClass(c: DecoratedContract): string {
  if (c.status === "active") {
    if (c.daysToExpiry !== null && c.daysToExpiry >= 0 && c.daysToExpiry <= 30) {
      return "chip pend";
    }
    return "chip ok";
  }
  if (c.status === "expired") return "chip rej";
  if (c.status === "terminated") return "chip info";
  if (c.status === "draft") return "chip pend";
  return "chip";
}

function ContractRow({ contract: c }: { contract: DecoratedContract }) {
  const typeLabel = TYPE_LABEL[c.contract_type ?? ""] ?? "—";
  const statusLabel = STATUS_LABEL[c.status] ?? c.status;
  const dDay = c.daysToExpiry;
  const dDayClass =
    dDay === null
      ? "text-text-3"
      : dDay < 0
        ? "text-[#E06B5F] italic"
        : dDay <= 30
          ? "text-gold italic"
          : "text-text-1";
  return (
    <tr>
      <td>
        <span className="chip">{typeLabel}</span>
      </td>
      <td>
        <span className="text-text-1">{c.title}</span>
      </td>
      <td>{c.vendors?.name ?? "—"}</td>
      <td className="n">
        {c.amount ? `₩${c.amount.toLocaleString("ko-KR")}` : "—"}
      </td>
      <td className="font-mono text-[12px]">{c.start_date ?? "—"}</td>
      <td className="font-mono text-[12px]">{c.end_date ?? "—"}</td>
      <td className={cn("n", dDayClass)}>
        {dDay === null
          ? "—"
          : dDay >= 0
            ? `D-${dDay}`
            : `D+${Math.abs(dDay)}`}
      </td>
      <td>
        <span className={statusChipClass(c)}>
          <i />
          {statusLabel}
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
