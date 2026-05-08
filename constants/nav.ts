import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  Clock,
  Wallet,
  CalendarCheck,
  Receipt,
  Handshake,
  Package,
  ClipboardCheck,
  ShieldAlert,
  TrendingUp,
  PiggyBank,
  FileSignature,
  Calendar,
  CalendarDays,
  Sparkles,
  Activity,
  Plane,
  Crown,
  Receipt as ReceiptIcon,
  BookOpen,
} from "lucide-react";

export type NavItem = {
  /** i18n key: nav.{key} */
  key: string;
  /** 폴백 한국어 라벨 */
  label: string;
  href: string;
  icon: LucideIcon;
  /** 모바일 하단 탭바에 노출할지 여부 */
  showInBottomBar?: boolean;
};

export const DASHBOARD_NAV: NavItem[] = [
  { key: "dashboard", label: "대시보드", href: "/dashboard", icon: LayoutDashboard, showInBottomBar: true },
  { key: "employees", label: "직원정보", href: "/employees", icon: Users, showInBottomBar: true },
  { key: "attendance", label: "근태입력", href: "/attendance", icon: Clock },
  { key: "payroll", label: "급여계산", href: "/payroll", icon: Wallet, showInBottomBar: true },
  { key: "leave", label: "연차관리", href: "/leave", icon: CalendarCheck },
  { key: "expenses", label: "지출입력", href: "/expenses", icon: Receipt, showInBottomBar: true },
  { key: "vendors", label: "거래처", href: "/vendors", icon: Handshake },
  { key: "assets", label: "자산관리", href: "/assets", icon: Package },
  { key: "closing", label: "월말결산", href: "/closing", icon: ClipboardCheck },
  { key: "approvals", label: "전자결재", href: "/approvals", icon: FileSignature },
  { key: "risks", label: "법적 리스크", href: "/risks", icon: ShieldAlert },
  { key: "simulator", label: "인건비 시뮬", href: "/simulator", icon: TrendingUp },
  { key: "retirement", label: "퇴직급여", href: "/retirement", icon: PiggyBank },
  { key: "year_end", label: "연말정산", href: "/year-end", icon: Calendar },
  { key: "calendar", label: "세무 캘린더", href: "/calendar", icon: CalendarDays },
  { key: "recruiting", label: "AI 채용공고", href: "/recruiting", icon: Sparkles },
  { key: "activity", label: "활동 피드", href: "/activity", icon: Activity },
  { key: "contracts", label: "계약서", href: "/contracts", icon: FileSignature },
  { key: "business_trips", label: "출장 정산", href: "/business-trips", icon: Plane },
  { key: "revenue", label: "매출", href: "/revenue", icon: ReceiptIcon },
  { key: "executive", label: "임원 대시보드", href: "/executive", icon: Crown },
  { key: "accounting", label: "회계", href: "/accounting", icon: BookOpen },
];
