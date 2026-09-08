import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Landmark,
  BadgeIndianRupee,
  Target,
  PiggyBank,
  ShieldCheck,
  CalendarDays,
  BarChart3,
  Settings,
  PlusCircle,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/accounts", label: "Accounts", icon: Landmark },
  { href: "/loans", label: "Loans", icon: BadgeIndianRupee },
  { href: "/debt-planner", label: "Debt Planner", icon: Target },
  { href: "/investments", label: "Investments", icon: PiggyBank },
  { href: "/emergency-fund", label: "Emergency Fund", icon: ShieldCheck },
  { href: "/calendar", label: "Cash-Flow Calendar", icon: CalendarDays },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/transactions", label: "Add", icon: PlusCircle },
  { href: "/budget", label: "Budget", icon: Wallet },
  { href: "/debt-planner", label: "Debt Plan", icon: Target },
];
