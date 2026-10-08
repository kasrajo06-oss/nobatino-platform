"use client";

import { BadgeCheck, CalendarDays, CreditCard, Database, History, LayoutDashboard, MessageSquare, MessageSquareText, Newspaper, Ticket, Users, Wallet } from "lucide-react";
import PanelShell from "@/components/panel/PanelShell";

const NAV = [
  { href: "/ops", label: "داشبورد", icon: LayoutDashboard },
  { href: "/ops/verifications", label: "احراز پزشکان و مراکز", icon: BadgeCheck },
  { href: "/ops/appointments", label: "پشتیبانی نوبت‌ها", icon: CalendarDays },
  { href: "/ops/users", label: "کاربران", icon: Users },
  { href: "/ops/reviews", label: "مدیریت نظرات", icon: MessageSquare },
  { href: "/ops/articles", label: "مجله سلامت", icon: Newspaper },
  { href: "/ops/packages", label: "پکیج‌های خدمات", icon: Ticket },
  { href: "/ops/settlements", label: "تسویه‌ها", icon: Wallet },
  { href: "/ops/payments", label: "پرداخت‌ها", icon: CreditCard },
  { href: "/ops/catalog", label: "داده‌های مرجع", icon: Database },
  { href: "/ops/sms", label: "لاگ پیامک", icon: MessageSquareText },
  { href: "/ops/audit", label: "گزارش رویدادها", icon: History },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelShell title="پنل اپراتور" nav={NAV} roles={["operator"]}>{children}</PanelShell>;
}
