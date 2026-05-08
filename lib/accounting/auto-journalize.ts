import "server-only";
import { createClient } from "@/lib/supabase/server";

/**
 * 자동 분개 룰.
 *
 * 트랜잭션 발생 시 차변·대변 분개를 자동 생성.
 * - 급여 확정: (차) 급여 / (대) 미지급금 + 예수금 (소득세·4대보험)
 * - 지출 등록: (차) 비용 / (대) 미지급금 (또는 현금)
 * - 자산 등록: (차) 비품/차량 / (대) 미지급금
 * - 매출 등록: (차) 매출채권 / (대) 매출 + 부가세예수금
 *
 * 본 모듈은 호출형 (수동 트리거 또는 server action 에서 호출).
 * 자동화는 향후 trigger 또는 Supabase Edge Function 로 확장.
 */

type AccountCode =
  | "1010" | "1020" | "1110" | "1210" | "1510" | "1520" | "1599"
  | "2010" | "2020" | "2030" | "2040" | "2110" | "2210"
  | "3010" | "3020"
  | "4010" | "4020"
  | "5110" | "5111" | "5120" | "5210" | "5310" | "5410"
  | "5510" | "5610" | "5710" | "5810" | "5910";

type JournalLine = {
  account_code: AccountCode;
  side: "debit" | "credit";
  amount: number;
  description?: string;
};

type CreateJournalArgs = {
  entry_date: string;
  description: string;
  source_type: "manual" | "payroll" | "expense" | "asset" | "revenue" | "closing";
  source_id?: string;
  lines: JournalLine[];
};

async function getAccountIdMap(): Promise<Record<string, string>> {
  const supabase = createClient();
  const { data } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("chart_of_accounts" as any)
    .select("id, code");
  const map: Record<string, string> = {};
  for (const row of (data as { id: string; code: string }[] | null) ?? []) {
    map[row.code] = row.id;
  }
  return map;
}

export async function createJournalEntry(
  args: CreateJournalArgs,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // 차변 = 대변 검증
  const debit = args.lines
    .filter((l) => l.side === "debit")
    .reduce((s, l) => s + l.amount, 0);
  const credit = args.lines
    .filter((l) => l.side === "credit")
    .reduce((s, l) => s + l.amount, 0);
  if (debit !== credit) {
    return {
      ok: false,
      error: `분개 등식 위반: 차변 ${debit} ≠ 대변 ${credit}`,
    };
  }
  if (args.lines.length < 2) {
    return { ok: false, error: "분개는 최소 2개 라인 필요" };
  }

  const accountMap = await getAccountIdMap();
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 1) 분개 헤더 생성
  const { data: entry, error: entryErr } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("journal_entries" as any)
    .insert({
      entry_date: args.entry_date,
      description: args.description,
      source_type: args.source_type,
      source_id: args.source_id ?? null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (entryErr || !entry) {
    return { ok: false, error: entryErr?.message ?? "헤더 생성 실패" };
  }

  const entryId = (entry as unknown as { id: string }).id;

  // 2) 라인 생성
  const lineRows = args.lines.map((l, idx) => {
    const accountId = accountMap[l.account_code];
    if (!accountId) {
      throw new Error(`계정과목 코드 ${l.account_code} 없음`);
    }
    return {
      entry_id: entryId,
      line_no: idx + 1,
      account_id: accountId,
      side: l.side,
      amount: l.amount,
      description: l.description ?? null,
    };
  });

  const { error: lineErr } = await supabase
    .schema("chongmu")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .from("journal_lines" as any)
    .insert(lineRows);

  if (lineErr) {
    // 헤더 롤백
    await supabase
      .schema("chongmu")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from("journal_entries" as any)
      .delete()
      .eq("id", entryId);
    return { ok: false, error: lineErr.message };
  }

  return { ok: true, id: entryId };
}

/**
 * 급여 확정 → 자동 분개.
 *
 * 단순화 모델:
 *   (차) 급여     gross_pay
 *   (대) 예수금    공제 합계 (소득세·4대보험)
 *   (대) 미지급금  net_pay
 */
export async function journalizePayroll(args: {
  payroll_id: string;
  pay_year: number;
  pay_month: number;
  gross_pay: number;
  total_deduction: number;
  net_pay: number;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  return createJournalEntry({
    entry_date: `${args.pay_year}-${String(args.pay_month).padStart(2, "0")}-25`,
    description: `${args.pay_year}년 ${args.pay_month}월 급여 (자동 분개)`,
    source_type: "payroll",
    source_id: args.payroll_id,
    lines: [
      {
        account_code: "5110",
        side: "debit",
        amount: args.gross_pay,
        description: "급여 총지급",
      },
      {
        account_code: "2030",
        side: "credit",
        amount: args.total_deduction,
        description: "예수금 (소득세·4대보험)",
      },
      {
        account_code: "2010",
        side: "credit",
        amount: args.net_pay,
        description: "실지급 미지급금",
      },
    ],
  });
}

/**
 * 지출 등록 → 자동 분개.
 *   (차) 비용 (카테고리별 매핑 또는 5910 기타비용)
 *   (대) 미지급금 (카드/이체) 또는 현금
 */
export async function journalizeExpense(args: {
  expense_id: string;
  expense_date: string;
  amount: number;
  vat: number;
  payment_method: string;
  category_name?: string | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  // 카테고리별 계정 매핑 (단순)
  const cat = args.category_name ?? "";
  let expenseAccount: AccountCode = "5910"; // 기본: 기타비용
  if (/임대|임차|월세/.test(cat)) expenseAccount = "5410";
  else if (/식비|복리|회식/.test(cat)) expenseAccount = "5210";
  else if (/여비|교통|출장/.test(cat)) expenseAccount = "5510";
  else if (/비품|소모|문구/.test(cat)) expenseAccount = "5610";
  else if (/광고|마케팅/.test(cat)) expenseAccount = "5710";
  else if (/수수료|용역/.test(cat)) expenseAccount = "5310";

  const total = args.amount + args.vat;
  const creditAccount: AccountCode = args.payment_method === "cash" ? "1010" : "2010";

  return createJournalEntry({
    entry_date: args.expense_date,
    description: `${cat || "지출"} (자동 분개)`,
    source_type: "expense",
    source_id: args.expense_id,
    lines: [
      {
        account_code: expenseAccount,
        side: "debit",
        amount: args.amount,
        description: cat || "비용",
      },
      ...(args.vat > 0
        ? [
            {
              account_code: "2040" as AccountCode,
              side: "debit" as const,
              amount: args.vat,
              description: "부가세대급금",
            },
          ]
        : []),
      {
        account_code: creditAccount,
        side: "credit",
        amount: total,
        description: args.payment_method === "cash" ? "현금" : "미지급금",
      },
    ],
  });
}
