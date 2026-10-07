"use client";

import { CalendarClock, CalendarDays, LayoutDashboard, MapPinned, MessageSquare, UserRound, Wallet } from "lucide-react";
import PanelShell from "@/components/panel/PanelShell";

const NAV = [
  { href: "/doctor-panel", label: "داشبورد", icon: LayoutDashboard },
  { href: "/doctor-panel/appointments", label: "نوبت‌ها", icon: CalendarDays },
  { href: "/doctor-panel/schedule", label: "برنامه کاری", icon: CalendarClock },
  { href: "/doctor-panel/offices", label: "مطب‌ها", icon: MapPinned },
  { href: "/doctor-panel/reviews", label: "نظرات بیماران", icon: MessageSquare },
  { href: "/doctor-panel/finance", label: "امور مالی", icon: Wallet },
  { href: "/doctor-panel/profile", label: "پروفایل و مدارک", icon: UserRound },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelShell title="پنل پزشک" nav={NAV} roles={["doctor"]}>{children}</PanelShell>;
}
