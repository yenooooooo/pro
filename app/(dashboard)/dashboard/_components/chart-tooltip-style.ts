/**
 * Recharts Tooltip 공통 스타일 — 다크 테마용.
 *
 * recharts 의 contentStyle 은 항목명(itemName)·라벨에 자동 cascade 되지 않으므로
 * itemStyle / labelStyle 을 명시해 글래스 패널과 같은 톤으로 통일한다.
 */

export const chartTooltipContentStyle = {
  background: "#171f33",
  border: "1px solid rgba(199,196,215,0.2)",
  borderRadius: 8,
  color: "#dae2fd",
  fontSize: 12,
} as const;

export const chartTooltipItemStyle = {
  color: "#dae2fd",
  fontSize: 12,
} as const;

export const chartTooltipLabelStyle = {
  color: "#c7c4d7",
  fontSize: 12,
  fontWeight: 600,
  marginBottom: 4,
} as const;
