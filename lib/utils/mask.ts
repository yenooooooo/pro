/**
 * 한국 은행 계좌번호 마스킹.
 * 110-123-456789 → 110-***-***6789
 * 끝 4자리만 노출, 그 외 숫자는 별표로 가린다.
 * 하이픈 없는 입력도 처리 (앞 3 + ***-*** + 끝 4 형태).
 */
export function maskBankAccount(account: string | null | undefined): string {
  if (!account) return "—";
  const trimmed = account.trim();
  if (!trimmed) return "—";

  if (trimmed.includes("-")) {
    const parts = trimmed.split("-");
    return parts
      .map((part, i, arr) => {
        if (i === 0) return part;
        if (i === arr.length - 1) {
          if (part.length <= 4) return part;
          return "*".repeat(part.length - 4) + part.slice(-4);
        }
        return "*".repeat(part.length);
      })
      .join("-");
  }

  const digits = trimmed.replace(/\D/g, "");
  if (digits.length < 8) return trimmed;
  return `${digits.slice(0, 3)}-***-***${digits.slice(-4)}`;
}
