"use client";

import { Bell, BellRing, CheckCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { num } from "@/lib/format";
import { notifMeta, timeAgo, useMarkRead, useNotificationSummary, type Notif } from "@/lib/notifications";

export function NotifRow({ n, onClick }: { n: Notif; onClick?: () => void }) {
  const { icon: Icon, tone } = notifMeta(n.kind);
  return (
    <button onClick={onClick} className={`flex w-full items-start gap-3 rounded-xl p-3 text-right transition hover:bg-slate-50 ${n.is_read ? "" : "bg-brand-50/50"}`}>
      <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <b className="truncate text-sm text-slate-900">{n.title}</b>
          {n.count > 1 && <span className="chip bg-brand-600 px-1.5 py-0 text-[10px] text-white ring-brand-600">{num(n.count)}</span>}
        </span>
        {n.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{n.body}</span>}
        <span className="mt-1 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
      </span>
      {!n.is_read && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-500" aria-label="خوانده نشده" />}
    </button>
  );
}

export default function NotificationBell() {
  const router = useRouter();
  const { data } = useNotificationSummary();
  const markRead = useMarkRead();
  const [open, setOpen] = useState(false);
  const [perm, setPerm] = useState<NotificationPermission | "unsupported">("default");
  const ref = useRef<HTMLDivElement>(null);
  const unread = data?.unread ?? 0;

  useEffect(() => {
    setPerm(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const go = (n: Notif) => {
    setOpen(false);
    if (!n.is_read) markRead({ ids: [n.id] });
    if (n.link) router.push(n.link);
  };

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="btn-ghost relative p-2.5" aria-label={`اعلان‌ها${unread ? ` (${unread} خوانده نشده)` : ""}`} aria-expanded={open}>
        {unread ? <BellRing className="size-5 text-brand-700" /> : <Bell className="size-5" />}
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white" data-testid="notif-badge">
            {unread > 99 ? "۹۹+" : num(unread)}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 z-50 mt-2 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-line">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <b>اعلان‌ها</b>
            {unread > 0 && (
              <button onClick={() => markRead({ all: true })} className="flex items-center gap-1 text-xs font-semibold text-brand-700">
                <CheckCheck className="size-4" /> خواندن همه
              </button>
            )}
          </div>
          {perm === "default" && (
            <button
              onClick={async () => setPerm(await Notification.requestPermission())}
              className="flex w-full items-center gap-2 bg-amber-50 px-4 py-2.5 text-right text-xs text-amber-900"
            >
              <BellRing className="size-4 shrink-0" /> فعال‌سازی اعلان مرورگر برای پیام‌ها و تماس‌ها، حتی وقتی این تب باز نیست
            </button>
          )}
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {data?.latest.length ? data.latest.map((n) => <NotifRow key={n.id} n={n} onClick={() => go(n)} />) : <p className="p-8 text-center text-sm text-muted">اعلانی ندارید.</p>}
          </div>
          <Link href="/notifications" onClick={() => setOpen(false)} className="block border-t border-line py-3 text-center text-sm font-semibold text-brand-700 hover:bg-slate-50">
            مشاهده همه اعلان‌ها
          </Link>
        </div>
      )}
    </div>
  );
}
