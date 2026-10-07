"use client";

import { CalendarCheck, FlaskConical, Hospital, LogIn, Menu, Stethoscope, UserRound, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useMe } from "@/lib/use-me";
import Logo from "./Logo";

const NAV = [
  { href: "/doctors", label: "نوبت‌دهی مطب", icon: Stethoscope },
  { href: "/centers", label: "مراکز درمانی", icon: Hospital },
  { href: "/centers/type/laboratory", label: "آزمایشگاه آنلاین", icon: FlaskConical },
];

export function panelHome(role?: string) {
  if (role === "doctor") return "/doctor-panel";
  if (role === "center_staff") return "/center-panel";
  if (role === "operator" || role === "superadmin") return "/ops";
  return "/panel";
}

export default function Header() {
  const { data: me } = useMe();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const inPanel = /^\/(panel|doctor-panel|center-panel|ops)/.test(pathname);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition hover:bg-brand-50 hover:text-brand-700 ${
                pathname === href ? "text-brand-700" : "text-slate-600"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          {me ? (
            <Link href={panelHome(me.role)} className="btn-outline py-2">
              <UserRound className="size-4" />
              <span className="max-w-32 truncate">{me.full_name || "حساب کاربری"}</span>
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn-primary py-2">
              <LogIn className="size-4" />
              ورود / ثبت‌نام
            </Link>
          )}
          {!inPanel && (
            <Link href="/panel/appointments" className="btn-ghost hidden py-2 sm:inline-flex">
              <CalendarCheck className="size-4" />
              نوبت‌های من
            </Link>
          )}
          <button className="btn-ghost p-2 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="منو">
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="border-t border-line bg-white md:hidden">
          <div className="container-page flex flex-col py-2">
            {[...NAV, { href: "/panel/appointments", label: "نوبت‌های من", icon: CalendarCheck }].map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-lg px-2 py-3 text-sm font-medium text-slate-700">
                <Icon className="size-4 text-brand-600" />
                {label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
