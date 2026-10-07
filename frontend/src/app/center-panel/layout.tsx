"use client";

import { CalendarClock, CalendarDays, FlaskConical, Hospital, Wallet } from "lucide-react";
import PanelShell from "@/components/panel/PanelShell";

const NAV = [
  { href: "/center-panel", label: "پذیرش‌ها", icon: CalendarDays },
  { href: "/center-panel/schedule", label: "برنامه پذیرش", icon: CalendarClock },
  { href: "/center-panel/lab-tests", label: "آزمایش‌ها و تعرفه", icon: FlaskConical },
  { href: "/center-panel/finance", label: "امور مالی", icon: Wallet },
  { href: "/center-panel/profile", label: "اطلاعات مرکز", icon: Hospital },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelShell title="پنل مرکز درمانی" nav={NAV} roles={["center_staff"]}>{children}</PanelShell>;
}
