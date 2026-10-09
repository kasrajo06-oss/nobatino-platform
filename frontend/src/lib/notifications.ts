"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  Bell,
  CalendarCheck,
  CalendarX,
  FlaskConical,
  MessageSquareText,
  Phone,
  PhoneMissed,
  PlayCircle,
  Star,
  Stethoscope,
  Ticket,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { get, post } from "./api";
import { useMe } from "./use-me";

export type Notif = {
  id: number;
  kind: string;
  title: string;
  body: string;
  link: string;
  count: number;
  is_read: boolean;
  created_at: string;
};
export type Summary = { unread: number; latest: Notif[]; call: Notif | null };

export const NOTIF_META: Record<string, { icon: LucideIcon; tone: string }> = {
  consult_request: { icon: Stethoscope, tone: "bg-violet-50 text-violet-600" },
  consult_started: { icon: PlayCircle, tone: "bg-emerald-50 text-emerald-600" },
  consult_message: { icon: MessageSquareText, tone: "bg-brand-50 text-brand-600" },
  consult_closed: { icon: BadgeCheck, tone: "bg-slate-100 text-slate-600" },
  call_incoming: { icon: Phone, tone: "bg-emerald-50 text-emerald-600" },
  call_missed: { icon: PhoneMissed, tone: "bg-rose-50 text-rose-600" },
  appointment_confirmed: { icon: CalendarCheck, tone: "bg-emerald-50 text-emerald-600" },
  appointment_new: { icon: CalendarCheck, tone: "bg-brand-50 text-brand-600" },
  appointment_cancelled: { icon: CalendarX, tone: "bg-rose-50 text-rose-600" },
  reminder: { icon: Bell, tone: "bg-amber-50 text-amber-600" },
  lab_result: { icon: FlaskConical, tone: "bg-amber-50 text-amber-600" },
  package: { icon: Ticket, tone: "bg-rose-50 text-rose-500" },
  review: { icon: Star, tone: "bg-amber-50 text-amber-500" },
  account: { icon: BadgeCheck, tone: "bg-brand-50 text-brand-600" },
  finance: { icon: Wallet, tone: "bg-emerald-50 text-emerald-600" },
};

export const notifMeta = (kind: string) => NOTIF_META[kind] ?? { icon: Bell, tone: "bg-slate-100 text-slate-600" };

/** Polled summary shared by the bell, the toaster and the incoming-call popup. */
export function useNotificationSummary() {
  const { data: me } = useMe();
  return useQuery({
    queryKey: ["notif-summary"],
    queryFn: () => get<Summary>("/me/notifications/summary/"),
    enabled: !!me,
    refetchInterval: 6000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return async (body: { ids?: number[]; link?: string; all?: boolean }) => {
    await post("/me/notifications/read/", body).catch(() => undefined);
    qc.invalidateQueries({ queryKey: ["notif-summary"] });
    qc.invalidateQueries({ queryKey: ["notif-list"] });
  };
}

export function timeAgo(iso: string) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  const fa = (n: number) => new Intl.NumberFormat("fa-IR").format(n);
  if (s < 60) return "همین حالا";
  if (s < 3600) return `${fa(Math.floor(s / 60))} دقیقه پیش`;
  if (s < 86400) return `${fa(Math.floor(s / 3600))} ساعت پیش`;
  return `${fa(Math.floor(s / 86400))} روز پیش`;
}
