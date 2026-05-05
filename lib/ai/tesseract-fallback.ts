/**
 * Tesseract.js 기반 영수증 OCR fallback (브라우저).
 *
 * Gemini API 가 없거나 실패할 때 클라이언트에서 직접 한국어 학습 모델로 텍스트 추출.
 * 정확도는 Gemini 보다 낮지만 외부 API 0개, 데이터 외부 유출 0.
 *
 * 호출자는 dynamic import 로 번들 크기 영향 최소화.
 */

import type { OcrParsedReceipt } from "./types";

export async function recognizeReceiptInBrowser(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<OcrParsedReceipt> {
  // 동적 import - Tesseract 자체가 큰 번들이라 사용 시점에만 로드
  const Tesseract = (await import("tesseract.js")).default;

  const worker = await Tesseract.createWorker(["kor", "eng"], 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    },
  });

  try {
    const { data } = await worker.recognize(file);
    return parseReceiptText(data.text);
  } finally {
    await worker.terminate();
  }
}

/**
 * Tesseract 가 추출한 raw 텍스트에서 정규식으로 영수증 항목 추출.
 * Gemini 가 의미 파싱까지 해주는 것과 달리 여기는 패턴 매칭만.
 */
function parseReceiptText(text: string): OcrParsedReceipt {
  const cleaned = text.replace(/\s+/g, " ");

  // 일자: 2026-04-23 / 2026.04.23 / 2026/04/23 / 2026년 4월 23일
  let date: string | null = null;
  const dateMatch =
    cleaned.match(/(20\d{2})[-./년\s]*(\d{1,2})[-./월\s]*(\d{1,2})/) ?? null;
  if (dateMatch) {
    const [, y, m, d] = dateMatch;
    date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // 합계: "합계 12,345원" 또는 "합 계 12345" 또는 "총액"
  let total: number | null = null;
  const totalMatch =
    cleaned.match(/(?:합\s*계|총\s*액|결\s*제|결제금액)[^\d]{0,5}([\d,]+)/) ??
    null;
  if (totalMatch) {
    const n = Number(totalMatch[1].replace(/,/g, ""));
    if (Number.isFinite(n)) total = n;
  }

  // VAT: "부가세 1,234원" 또는 "부가가치세"
  let vat: number | null = null;
  const vatMatch =
    cleaned.match(/(?:부\s*가\s*세|부가가치세|VAT)[^\d]{0,5}([\d,]+)/i) ??
    null;
  if (vatMatch) {
    const n = Number(vatMatch[1].replace(/,/g, ""));
    if (Number.isFinite(n)) vat = n;
  }

  // amount = total - vat (둘 다 있으면)
  let amount: number | null = null;
  if (total !== null && vat !== null) {
    amount = total - vat;
  } else if (total !== null && vat === null) {
    // 총액의 1/11 을 VAT 로 추정
    vat = Math.round(total / 11);
    amount = total - vat;
  }

  // 사업자번호: 000-00-00000
  const bizMatch = cleaned.match(/(\d{3})[-\s](\d{2})[-\s](\d{5})/);
  const business_no = bizMatch ? `${bizMatch[1]}-${bizMatch[2]}-${bizMatch[3]}` : null;

  // 결제수단
  let payment_method: "card" | "cash" | "transfer" | "other" | null = null;
  if (/신용\s*카드|체크\s*카드|VISA|MASTER|카드/i.test(cleaned)) {
    payment_method = "card";
  } else if (/현금|현금영수증/.test(cleaned)) {
    payment_method = "cash";
  } else if (/계좌\s*이체|이체/.test(cleaned)) {
    payment_method = "transfer";
  }

  // 가맹점명: 첫 줄 또는 "상호" 다음
  let vendor_name: string | null = null;
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  for (const line of lines.slice(0, 5)) {
    if (/^[가-힣A-Za-z0-9 .()&]{2,30}$/.test(line) && !/[\d,]{5,}/.test(line)) {
      vendor_name = line;
      break;
    }
  }

  return {
    date,
    amount,
    vat,
    total,
    vendor_name,
    business_no,
    payment_method,
    description: vendor_name ? `${vendor_name} 영수증` : null,
  };
}
