"use client";

import { Phone, PhoneOff, Video, X } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { notifMeta, useMarkRead, useNotificationSummary, type Notif } from "@/lib/notifications";
import { playDing, useRingtone } from "@/lib/ringtone";

type Toast = Notif & { key: number };

/**
 * Mounted once (in the header) for logged-in users. Turns new notifications into
 * toasts + desktop notifications, and incoming calls into a ringing popup on any page.
 */
export default function NotificationWatcher() {
  const router = useRouter();
  const pathname = usePathname();
  const { data } = useNotificationSummary();
  const markRead = useMarkRead();
  // id -> created_at of notifications already shown (chat notifications are merged, so the timestamp changes)
  const seen = useRef<Map<number, string> | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dismissedCall, setDismissedCall] = useState<number | null>(null);

  // new notifications -> toast + desktop notification
  useEffect(() => {
    if (!data) return;
    if (seen.current === null) {
      seen.current = new Map(data.latest.map((n) => [n.id, n.created_at])); // first load: don't pop up old ones
      return;
    }
    const known = seen.current;
    const fresh = data.latest.filter(
      (n) => known.get(n.id) !== n.created_at && !n.is_read && n.kind !== "call_incoming" && n.link !== pathname,
    );
    data.latest.forEach((n) => known.set(n.id, n.created_at));
    if (!fresh.length) return;
    playDing();
    setToasts((t) => [...fresh.map((n) => ({ ...n, key: n.id + Date.now() })), ...t].slice(0, 3));
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      fresh.forEach((n) => {
        const desktop = new Notification(n.title, { body: n.body, tag: `notif-${n.id}`, dir: "rtl", lang: "fa" });
        desktop.onclick = () => {
          window.focus();
          if (n.link) router.push(n.link);
          desktop.close();
        };
      });
    }
  }, [data, pathname, router]);

  // auto-dismiss toasts
  useEffect(() => {
    if (!toasts.length) return;
    const t = setTimeout(() => setToasts((all) => all.slice(0, -1)), 7000);
    return () => clearTimeout(t);
  }, [toasts]);

  // incoming call popup (the consult room page rings by itself)
  const call = data?.call && data.call.id !== dismissedCall && data.call.link !== pathname ? data.call : null;
  useRingtone(!!call);
  const lastDesktopCall = useRef<number | null>(null);
  useEffect(() => {
    if (!call || lastDesktopCall.current === call.id) return;
    lastDesktopCall.current = call.id;
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      const n = new Notification(call.title, { body: call.body, tag: `call-${call.id}`, requireInteraction: true, dir: "rtl", lang: "fa" });
      n.onclick = () => {
        window.focus();
        router.push(call.link);
        n.close();
      };
    }
  }, [call, router]);

  const open = (n: Notif) => {
    markRead({ ids: [n.id] });
    setToasts((t) => t.filter((x) => x.id !== n.id));
    if (n.link) router.push(n.link);
  };

  return (
    <>
      {call && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm" role="alertdialog" aria-label="تماس ورودی">
          <div className="w-full max-w-sm rounded-3xl bg-slate-900 p-8 text-center text-white shadow-2xl">
            <span className="relative mx-auto grid size-20 place-items-center rounded-full bg-emerald-500">
              <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400 opacity-60" />
              {call.body.includes("تصویری") ? <Video className="relative size-9" /> : <Phone className="relative size-9" />}
            </span>
            <p className="mt-6 text-lg font-extrabold">{call.title}</p>
            <p className="mt-1 text-sm text-slate-300">{call.body}</p>
            <div className="mt-8 flex gap-3">
              <button onClick={() => { setDismissedCall(call.id); markRead({ ids: [call.id] }); }} className="btn flex-1 bg-rose-500 py-3 text-white hover:bg-rose-600">
                <PhoneOff className="size-4" /> بعداً
              </button>
              <button onClick={() => { setDismissedCall(call.id); router.push(call.link); }} className="btn flex-1 bg-emerald-500 py-3 text-white hover:bg-emerald-600">
                <Phone className="size-4" /> پاسخ
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="pointer-events-none fixed bottom-4 left-4 z-[55] flex w-[360px] max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {toasts.map((n) => {
          const { icon: Icon, tone } = notifMeta(n.kind);
          return (
            <div key={n.key} className="pointer-events-auto flex items-start gap-3 rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-line" data-testid="notif-toast">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${tone}`}><Icon className="size-5" /></span>
              <button onClick={() => open(n)} className="min-w-0 flex-1 text-right">
                <b className="block text-sm text-slate-900">{n.title}</b>
                {n.body && <span className="mt-0.5 line-clamp-2 block text-xs leading-5 text-slate-600">{n.body}</span>}
              </button>
              <button onClick={() => setToasts((t) => t.filter((x) => x.key !== n.key))} className="text-slate-400 hover:text-slate-700" aria-label="بستن"><X className="size-4" /></button>
            </div>
          );
        })}
      </div>
    </>
  );
}
