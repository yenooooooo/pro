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

export function maskBankAccount(account: string): string {
  if (!account) return "";
  const digits = account.replace(/[^0-9]/g, "");
  if (digits.length < 6) return account;
  return `${digits.slice(0, 4)}-**-**${digits.slice(-4)}`;
}
