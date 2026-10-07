"use client";

import { CalendarCheck, MessageSquare, UserRound, Users, Wallet } from "lucide-react";
import PanelShell from "@/components/panel/PanelShell";

const NAV = [
  { href: "/panel/appointments", label: "نوبت‌های من", icon: CalendarCheck },
  { href: "/panel/family", label: "اعضای خانواده", icon: Users },
  { href: "/panel/wallet", label: "کیف پول", icon: Wallet },
  { href: "/panel/reviews", label: "نظرات من", icon: MessageSquare },
  { href: "/panel/profile", label: "اطلاعات کاربری", icon: UserRound },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PanelShell title="پنل کاربری" nav={NAV}>{children}</PanelShell>;
}
