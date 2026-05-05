/**
 * 거래처 사업자등록번호 진위 확인.
 *
 * GET /api/vendors/verify?b=1234567890
 *
 * - 1순위: 국세청 odcloud.kr API (NTS_API_KEY 환경변수)
 *   https://api.odcloud.kr/api/nts-businessman/v1/status
 * - 2순위 fallback: 형식 검증만 (체크섬 알고리즘)
 *
 * 응답:
 *   { ok, source: "nts" | "format", valid, status, taxStatus, businessName? }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { ok: false, error: "인증이 필요합니다." },
      { status: 401 },
    );
  }

  const url = new URL(req.url);
  const raw = url.searchParams.get("b") ?? "";
  const cleaned = raw.replace(/\D/g, "");
  if (cleaned.length !== 10) {
    return NextResponse.json(
      { ok: false, error: "사업자등록번호는 10자리 숫자입니다." },
      { status: 400 },
    );
  }

  // 1) NTS API 시도 (KEY 있을 때만)
  const ntsKey = process.env.NTS_API_KEY;
  if (ntsKey) {
    try {
      const res = await fetch(
        `https://api.odcloud.kr/api/nts-businessman/v1/status?serviceKey=${encodeURIComponent(ntsKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ b_no: [cleaned] }),
          // odcloud.kr 은 짧은 timeout 권장
          signal: AbortSignal.timeout(5000),
        },
      );
      if (res.ok) {
        const json = await res.json();
        const item = json?.data?.[0];
        if (item) {
          return NextResponse.json({
            ok: true,
            source: "nts",
            valid: item.b_stt_cd !== "03", // 03 = 폐업
            status: item.b_stt ?? "—",
            taxStatus: item.tax_type ?? "—",
            taxType: item.tax_type_cd ?? null,
          });
        }
      }
    } catch {
      // 실패 시 format fallback 으로
    }
  }

  // 2) 형식 검증 (체크섬)
  // 한국 사업자등록번호 검증 알고리즘
  const checksum = validateChecksum(cleaned);
  return NextResponse.json({
    ok: true,
    source: "format",
    valid: checksum,
    status: checksum ? "형식 유효" : "형식 오류",
    taxStatus: "—",
    note: ntsKey
      ? "NTS API 호출 실패. 형식 검증만 수행."
      : "NTS_API_KEY 미설정. 형식 검증만 수행. 실제 사업자 상태(휴/폐업) 확인 불가.",
  });
}

/**
 * 한국 사업자등록번호 체크섬 알고리즘.
 * 가중치 [1,3,7,1,3,7,1,3,5] 곱한 합 + d8(2자리) 합 % 10 == 0
 */
function validateChecksum(num: string): boolean {
  if (num.length !== 10) return false;
  const weights = [1, 3, 7, 1, 3, 7, 1, 3, 5];
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += Number(num[i]) * weights[i];
  }
  sum += Math.floor((Number(num[8]) * 5) / 10);
  const check = (10 - (sum % 10)) % 10;
  return check === Number(num[9]);
}
