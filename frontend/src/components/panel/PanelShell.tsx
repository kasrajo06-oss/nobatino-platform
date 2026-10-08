"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Spinner from "@/components/ui/Spinner";
import { post } from "@/lib/api";
import { ROLE_LABELS } from "@/lib/format";
import type { User } from "@/lib/types";
import { useMe } from "@/lib/use-me";

export type NavItem = { href: string; label: string; icon: LucideIcon };

export default function PanelShell({
  title,
  nav,
  roles,
  children,
}: {
  title: string;
  nav: NavItem[];
  roles?: User["role"][];
  children: React.ReactNode;
}) {
  const { data: me, isLoading } = useMe();
  const pathname = usePathname();
  const router = useRouter();
  const qc = useQueryClient();

  if (isLoading) return <div className="grid h-[60vh] place-items-center text-brand-600"><Spinner className="size-8" /></div>;
  if (!me) {
    router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    return null;
  }
  const allowed = !roles || roles.includes(me.role) || me.role === "superadmin";
  const logout = async () => {
    await post("/auth/logout/");
    qc.setQueryData(["me"], null);
    window.location.assign("/");
  };

  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[240px_1fr]">
      <aside className="space-y-3">
        <div className="card p-4">
          <p className="font-bold">{me.full_name || me.mobile}</p>
          <p className="text-xs text-muted">{title} · {ROLE_LABELS[me.role]}</p>
        </div>
        <nav className="card flex gap-1 overflow-x-auto p-2 lg:flex-col">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || (href.split("/").length > 2 && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium ${active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-50"}`}
              >
                <Icon className="size-4" /> {label}
              </Link>
            );
          })}
          <button onClick={logout} className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 hover:bg-rose-50">
            <LogOut className="size-4" /> خروج
          </button>
        </nav>
      </aside>
      <section className="min-w-0">
        {allowed ? children : <div className="card p-8 text-center text-sm text-muted">شما به این بخش دسترسی ندارید.</div>}
      </section>
    </div>
  );
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h1 className="text-xl font-extrabold">{children}</h1>
      {action}
    </div>
  );
}

export function StatCard({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: [T, string][] }) {
  return (
    <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-line">
      {items.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium ${value === v ? "bg-brand-600 text-white" : "text-slate-600 hover:bg-slate-50"}`}>
          {l}
        </button>
      ))}
    </div>
  );
}
