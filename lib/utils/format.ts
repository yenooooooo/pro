export function formatKRW(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ko-KR").format(n);
}

/**
 * 한국형 금액 축약 — KPI 카드같은 소공간용.
 * 예: 42_500_000 → "4,250만" · 1_280_000_000 → "12.8억" · 840_000 → "84만"
 * 단위를 별도 반환해 렌더링 측에서 스타일 분리 가능하게 한다.
 */
export function formatKRWCompact(amount: number): { value: string; unit: string } {
  const absolute = Math.abs(amount);
  if (absolute >= 100_000_000) {
    const eok = amount / 100_000_000;
    return {
      value: eok.toLocaleString("ko-KR", { maximumFractionDigits: 1 }),
      unit: "억",
    };
  }
  if (absolute >= 10_000) {
    const man = amount / 10_000;
    return {
      value: man.toLocaleString("ko-KR", { maximumFractionDigits: 0 }),
      unit: "만",
    };
  }
  return { value: amount.toLocaleString("ko-KR"), unit: "원" };
}

/**
 * 전월/전년 대비 변화율 포맷. 부호 포함.
 * 예: 0.024 → "+2.4%" · -0.031 → "-3.1%"
 */
export function formatDelta(ratio: number): string {
  const sign = ratio > 0 ? "+" : ratio < 0 ? "" : "";
  return `${sign}${(ratio * 100).toFixed(1)}%`;
}

/**
 * 내용연수·계약기간 등의 남은 기간을 한국식으로 포맷.
 * - 0 이하: "만료"
 * - 1개월 미만: "1개월 미만"
 * - 1~11개월: "N개월"
 * - 12개월 이상: "N년" 또는 "N년 M개월"
 *
 * 예: 0.05 → "1개월 미만", 0.9 → "11개월", 1.5 → "1년 6개월", 2.0 → "2년"
 */
export function formatRemainingYears(years: number): string {
  if (years <= 0) return "만료";
  const totalMonths = Math.round(years * 12);
  if (totalMonths < 1) return "1개월 미만";
  if (totalMonths < 12) return `${totalMonths}개월`;
  const y = Math.floor(totalMonths / 12);
  const m = totalMonths % 12;
  return m === 0 ? `${y}년` : `${y}년 ${m}개월`;
}

export function maskBankAccount(account: string): string {
  if (!account) return "";
  const digits = account.replace(/[^0-9]/g, "");
  if (digits.length < 6) return account;
  return `${digits.slice(0, 4)}-**-**${digits.slice(-4)}`;
}
