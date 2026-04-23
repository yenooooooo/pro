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
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  /** 모바일 하단 탭바에 노출할지 여부 */
  showInBottomBar?: boolean;
};

export const DASHBOARD_NAV: NavItem[] = [
  { label: "대시보드", href: "/dashboard", icon: LayoutDashboard, showInBottomBar: true },
  { label: "직원정보", href: "/employees", icon: Users, showInBottomBar: true },
  { label: "근태입력", href: "/attendance", icon: Clock },
  { label: "급여계산", href: "/payroll", icon: Wallet, showInBottomBar: true },
  { label: "연차관리", href: "/leave", icon: CalendarCheck },
  { label: "지출입력", href: "/expenses", icon: Receipt, showInBottomBar: true },
  { label: "거래처", href: "/vendors", icon: Handshake },
  { label: "자산관리", href: "/assets", icon: Package },
  { label: "월말결산", href: "/closing", icon: ClipboardCheck },
];
