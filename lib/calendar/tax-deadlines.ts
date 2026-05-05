/**
 * 한국 세무·법정 신고 마감일 정의.
 *
 * 정적 데이터 (DB 불필요) — 매년 동일 패턴.
 * ICS export 와 캘린더 페이지 양쪽에서 활용.
 */

export type TaxDeadline = {
  id: string;
  /** ISO date YYYY-MM-DD */
  date: string;
  title: string;
  description: string;
  category: "insurance" | "withholding" | "vat" | "corporate" | "year_end";
  severity: "info" | "warn" | "danger";
};

/**
 * 특정 연도의 모든 세무 마감일 생성.
 * - 매월 10일: 4대보험 + 원천세
 * - 매분기 25일 (4/25, 7/25, 10/25, 1/25): 부가세 (개인사업자 25일/법인 25일)
 * - 3월 31일: 법인세 신고
 * - 1~2월: 연말정산
 */
export function getTaxDeadlines(year: number): TaxDeadline[] {
  const items: TaxDeadline[] = [];

  // 매월 10일 — 4대보험 + 원천세
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, "0");
    items.push({
      id: `insurance-${year}-${mm}`,
      date: `${year}-${mm}-10`,
      title: "4대보험·원천세 신고",
      description:
        "국민연금/건강보험/고용보험/산재 보수월액 신고 + 근로소득세·지방소득세 원천세 신고",
      category: "insurance",
      severity: "warn",
    });
  }

  // 부가가치세 — 분기별 25일 (1기 예정/확정, 2기 예정/확정)
  // 개인사업자: 1/25 확정, 7/25 확정 (반기)
  // 법인: 4/25, 7/25, 10/25, 1/25 (분기)
  const vatDates = [
    { month: 1, day: 25, label: "부가가치세 확정 신고 (작년 2기 / 또는 4분기)" },
    { month: 4, day: 25, label: "부가가치세 예정 신고 (1분기)" },
    { month: 7, day: 25, label: "부가가치세 확정 신고 (1기 / 2분기)" },
    { month: 10, day: 25, label: "부가가치세 예정 신고 (3분기)" },
  ];
  for (const v of vatDates) {
    const mm = String(v.month).padStart(2, "0");
    const dd = String(v.day).padStart(2, "0");
    items.push({
      id: `vat-${year}-${mm}`,
      date: `${year}-${mm}-${dd}`,
      title: v.label,
      description: "홈택스 신고. 매출세액 - 매입세액 = 납부세액",
      category: "vat",
      severity: "warn",
    });
  }

  // 법인세 신고 — 3월 31일 (12월 결산법인)
  items.push({
    id: `corporate-${year}`,
    date: `${year}-03-31`,
    title: "법인세 신고·납부",
    description:
      "12월 결산 법인의 법인세 신고 및 납부 (전년도 사업연도 분). 외부감사 보고서 첨부",
    category: "corporate",
    severity: "danger",
  });

  // 연말정산 (1~2월)
  items.push(
    {
      id: `year-end-collect-${year}`,
      date: `${year}-01-15`,
      title: "연말정산 자료 수집 마감",
      description: "직원별 소득공제 자료 (의료비/교육비/기부금 등) 제출 마감 권장",
      category: "year_end",
      severity: "info",
    },
    {
      id: `year-end-pay-${year}`,
      date: `${year}-02-28`,
      title: "연말정산 환급/추가납부 처리",
      description: "정산 결과 반영해 2월 급여에 환급/추가징수",
      category: "year_end",
      severity: "warn",
    },
  );

  // 정렬
  items.sort((a, b) => a.date.localeCompare(b.date));
  return items;
}

/** ICS 형식으로 export */
export function deadlinesToIcs(year: number, items: TaxDeadline[]): string {
  const dtstamp = new Date()
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

  const events = items
    .map((item) => {
      const dt = item.date.replace(/-/g, "");
      const uid = `${item.id}@nexus-erp.app`;
      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART;VALUE=DATE:${dt}`,
        `DTEND;VALUE=DATE:${dt}`,
        `SUMMARY:${escapeIcs(item.title)}`,
        `DESCRIPTION:${escapeIcs(item.description)}`,
        `CATEGORIES:${item.category}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nexus ERP//Tax Deadlines KO//KO",
    `X-WR-CALNAME:Nexus ERP — ${year}년 세무 마감일`,
    "X-WR-TIMEZONE:Asia/Seoul",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
}

function escapeIcs(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}
