import "server-only";

/**
 * 한국 공휴일 조회 — data.go.kr 한국천문연구원 특일 정보 API.
 *
 * https://www.data.go.kr/data/15012690/openapi.do
 *
 * 환경변수 HOLIDAYS_API_KEY (decoded service key) 미설정 시 정적 폴백 사용.
 * 정적 폴백은 대체공휴일·임시공휴일 미반영 — 정확성 위해 API 권장.
 *
 * 메모리 캐시: 동일 (year, month) 호출 시 재사용.
 */

const cache = new Map<string, string[]>();

export async function getKoreanHolidays(
  year: number,
  month?: number,
): Promise<string[]> {
  const key = month ? `${year}-${month}` : `${year}`;
  if (cache.has(key)) return cache.get(key)!;

  const apiKey = process.env.HOLIDAYS_API_KEY;
  if (apiKey) {
    try {
      const dates = await fetchFromApi(apiKey, year, month);
      cache.set(key, dates);
      return dates;
    } catch (err) {
      console.warn("[holidays] API 실패, 정적 폴백 사용:", err);
    }
  }

  const dates = staticFallback(year, month);
  cache.set(key, dates);
  return dates;
}

async function fetchFromApi(
  apiKey: string,
  year: number,
  month?: number,
): Promise<string[]> {
  const params = new URLSearchParams({
    serviceKey: apiKey,
    solYear: String(year),
    numOfRows: "50",
    _type: "json",
  });
  if (month) params.set("solMonth", String(month).padStart(2, "0"));

  const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo?${params}`;
  const res = await fetch(url, {
    next: { revalidate: 86400 }, // 24h cache
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();

  const items =
    json?.response?.body?.items?.item ??
    [];
  const arr = Array.isArray(items) ? items : [items];

  return arr
    .filter((it: { isHoliday?: string }) => it.isHoliday === "Y")
    .map((it: { locdate: number | string }) => {
      const s = String(it.locdate);
      return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
    });
}

/** 2025~2026년 법정공휴일 (대체공휴일 반영, 임시공휴일은 별도 갱신 필요) */
function staticFallback(year: number, month?: number): string[] {
  const all: Record<number, string[]> = {
    2025: [
      "2025-01-01", // 신정
      "2025-01-28", "2025-01-29", "2025-01-30", // 설날 (음 12/29~1/1)
      "2025-03-01", // 3·1절
      "2025-05-05", // 어린이날 / 부처님오신날 (음 4/8 = 5/5 겹침)
      "2025-05-06", // 대체공휴일
      "2025-06-06", // 현충일
      "2025-08-15", // 광복절
      "2025-10-03", // 개천절
      "2025-10-05", "2025-10-06", "2025-10-07", "2025-10-08", // 추석 (음 8/14~16) + 한글날 대체
      "2025-10-09", // 한글날
      "2025-12-25", // 성탄절
    ],
    2026: [
      "2026-01-01", // 신정
      "2026-02-16", "2026-02-17", "2026-02-18", // 설날
      "2026-03-01", "2026-03-02", // 3·1절 + 대체
      "2026-05-05", // 어린이날
      "2026-05-24", "2026-05-25", // 부처님오신날 + 대체
      "2026-06-06", // 현충일
      "2026-08-15", "2026-08-17", // 광복절 + 대체 (15일 토요일)
      "2026-09-24", "2026-09-25", "2026-09-26", // 추석
      "2026-10-03", "2026-10-05", // 개천절 + 대체
      "2026-10-09", // 한글날
      "2026-12-25", // 성탄절
    ],
  };
  const list = all[year] ?? [];
  if (!month) return list;
  const mm = String(month).padStart(2, "0");
  return list.filter((d) => d.startsWith(`${year}-${mm}-`));
}

/** 특정 날짜가 공휴일인지 — 단순 boolean */
export async function isHoliday(date: Date): Promise<boolean> {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const list = await getKoreanHolidays(y, m);
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return list.includes(iso);
}

export function isHolidayApiConfigured(): boolean {
  return Boolean(process.env.HOLIDAYS_API_KEY);
}
