/**
 * Enum 한글 라벨 사전 — 화면 표시용.
 *
 * DB 는 영문 enum 그대로 (검색/정렬/마이그레이션 안전), 사용자에게 보일 때만
 * 이 사전을 통과시켜 한글로 표기. CLAUDE.md §14.7 한·영 혼용 원칙 준수:
 *   "기능·데이터는 한글, 브랜드 분위기는 영어"
 *
 * 페이지·컴포넌트는 직접 인라인 매핑 대신 이 모듈을 import 해서 일관성 유지.
 */

// ── 자산 ────────────────────────────────────────────────
export const ASSET_STATUS_LABEL: Record<string, string> = {
  in_use: "사용 중",
  repair: "수리 중",
  disposed: "폐기",
  sold: "매각",
};

export const ASSET_CATEGORY_LABEL: Record<string, string> = {
  it_device: "IT 기기",
  furniture: "사무가구",
  vehicle: "차량",
  equipment: "장비",
  other: "기타",
};

// ── 직원 ────────────────────────────────────────────────
export const EMPLOYEE_STATUS_LABEL: Record<string, string> = {
  active: "재직",
  leave: "휴직",
  resigned: "퇴사",
};

// ── 급여 ────────────────────────────────────────────────
export const PAYROLL_STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  confirmed: "확정",
  paid: "지급 완료",
};

// ── 휴가 ────────────────────────────────────────────────
export const LEAVE_TYPE_LABEL: Record<string, string> = {
  annual: "연차",
  sick: "병가",
  family: "경조사",
  other: "기타",
};

export const LEAVE_STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
};

// ── 지출 ────────────────────────────────────────────────
export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  card: "카드",
  cash: "현금",
  transfer: "이체",
  other: "기타",
};

// ── 거래처 ────────────────────────────────────────────────
export const VENDOR_CATEGORY_LABEL: Record<string, string> = {
  partner: "협력사",
  supplier: "공급사",
  customer: "고객사",
  other: "기타",
};

// ── 결재 ────────────────────────────────────────────────
export const APPROVAL_KIND_LABEL: Record<string, string> = {
  expense: "지출",
  purchase: "구매",
  business_trip: "출장",
  general: "일반",
};

export const APPROVAL_STATUS_LABEL: Record<string, string> = {
  draft: "작성 중",
  pending: "결재 중",
  approved: "승인",
  rejected: "반려",
  cancelled: "취소",
};

export const APPROVAL_STEP_STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  approved: "승인",
  rejected: "반려",
  skipped: "건너뜀",
};

// ── RBAC ────────────────────────────────────────────────
export const USER_ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  hr: "인사",
  finance: "재무",
  employee: "직원",
};

// ── 헬퍼: 매핑에 없는 값 fallback ────────────────────────
export function label(map: Record<string, string>, value: string | null | undefined): string {
  if (!value) return "—";
  return map[value] ?? value;
}
