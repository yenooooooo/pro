import Link from "next/link";
import { ArrowLeft, FileX, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { differenceInYears } from "date-fns";
import { AnonymizeButton } from "./_anonymize";

export const dynamic = "force-dynamic";

const RETENTION_YEARS = 5; // 퇴사 후 5년 보존

type Resigned = {
  id: string;
  name: string;
  employee_no: string | null;
  resign_date: string | null;
  bank_account: string | null;
  email: string | null;
  phone: string | null;
};

export default async function PrivacyPage() {
  const supabase = createClient();

  const { data: rows } = await supabase
    .schema("chongmu")
    .from("employees")
    .select(
      "id, name, employee_no, resign_date, bank_account, email, phone",
    )
    .eq("status", "resigned")
    .not("resign_date", "is", null)
    .order("resign_date", { ascending: true });

  const today = new Date();
  const candidates = ((rows as Resigned[]) ?? []).map((r) => {
    const resignDate = r.resign_date ? new Date(r.resign_date) : null;
    const yearsElapsed = resignDate
      ? differenceInYears(today, resignDate)
      : 0;
    const isAlreadyAnonymized =
      !r.email && !r.phone && !r.bank_account; // 마스킹 흔적
    return {
      ...r,
      yearsElapsed,
      isExpired: yearsElapsed >= RETENTION_YEARS,
      isAlreadyAnonymized,
    };
  });

  const expired = candidates.filter((c) => c.isExpired && !c.isAlreadyAnonymized);
  const upcoming = candidates.filter(
    (c) => !c.isExpired && c.yearsElapsed >= RETENTION_YEARS - 1,
  );

  return (
    <div className="space-y-stack-lg">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-label-sm text-on-surface-variant transition-colors hover:text-on-surface"
      >
        <ArrowLeft aria-hidden className="h-4 w-4" />
        시스템 설정
      </Link>

      <header className="space-y-2">
        <p className="inline-flex items-center gap-2 text-label-sm uppercase tracking-widest text-primary">
          <FileX aria-hidden className="h-4 w-4" />
          Privacy & Retention
        </p>
        <h1 className="text-headline-lg font-semibold tracking-tight text-on-surface">
          개인정보 자동 폐기
        </h1>
        <p className="text-body-md text-on-surface-variant">
          개인정보보호법 준수 — 퇴사 후 {RETENTION_YEARS}년 경과 직원의 민감 정보 (이메일/전화/계좌)를
          익명화 처리. 본인 확인이 가능한 정보는 마스킹하되 audit 로그·급여 이력 등 회계 보존 의무 데이터는 유지.
        </p>
      </header>

      {/* 대상 */}
      {expired.length > 0 ? (
        <section className="glass-panel rounded-xl p-6">
          <header className="mb-4 flex items-center gap-2">
            <ShieldAlert aria-hidden className="h-5 w-5 text-error-soft" />
            <h2 className="text-headline-md font-semibold text-on-surface">
              자동 폐기 대상 {expired.length}명
            </h2>
          </header>
          <p className="mb-4 text-label-sm text-on-surface-variant">
            아래 직원들은 퇴사 후 {RETENTION_YEARS}년 경과로 익명화 대상입니다. 각 직원별 또는 일괄 처리 가능.
          </p>
          <ul className="space-y-2">
            {expired.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-error-soft/30 bg-error-soft/5 p-4"
              >
                <div>
                  <p className="font-semibold text-on-surface">{c.name}</p>
                  <p className="text-label-sm text-on-surface-variant tabular-nums">
                    {c.employee_no} · 퇴사 {c.resign_date} ({c.yearsElapsed}년 경과)
                  </p>
                </div>
                <AnonymizeButton employeeId={c.id} employeeName={c.name} />
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <section className="glass-panel rounded-xl p-12 text-center">
          <ShieldAlert aria-hidden className="mx-auto h-10 w-10 text-emerald-300" />
          <p className="mt-3 text-headline-md font-semibold text-on-surface">
            ✓ 폐기 대상 없음
          </p>
          <p className="mt-1 text-body-md text-on-surface-variant">
            현재 {RETENTION_YEARS}년 보존 기간이 지난 퇴사 직원이 없습니다.
          </p>
        </section>
      )}

      {/* 임박 */}
      {upcoming.length > 0 ? (
        <section className="glass-panel rounded-xl p-6">
          <h2 className="mb-3 text-headline-md font-semibold text-on-surface">
            만료 임박 {upcoming.length}명
          </h2>
          <p className="mb-3 text-label-sm text-on-surface-variant">
            1년 이내 폐기 예정. 회계·법무 보존 의무 검토 권장.
          </p>
          <ul className="space-y-2">
            {upcoming.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-label-sm"
              >
                <span className="text-on-surface">{c.name}</span>
                <span className="text-on-surface-variant tabular-nums">
                  퇴사 {c.resign_date} (D-{(RETENTION_YEARS - c.yearsElapsed) * 365})
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="glass-panel rounded-xl p-4">
        <p className="text-label-sm text-on-surface-variant">
          ⚖️ 개인정보보호법 §21 (개인정보의 파기) 준수. 익명화는 다음을 처리:
          이메일·전화 NULL, 계좌번호 NULL, 이름 → &quot;익명_익월일&quot;.
          audit_logs, payroll, leave_requests 등 회계·법무 보존 의무 데이터는 유지.
        </p>
      </div>
    </div>
  );
}
