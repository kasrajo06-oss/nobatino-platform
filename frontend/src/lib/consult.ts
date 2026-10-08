import type { Appointment } from "./types";

export type ConsultKind = "phone" | "text" | "video";

export type ConsultService = { kind: ConsultKind; kind_display: string; price: number; duration_minutes: number; instant_enabled: boolean };

export type Consultation = {
  id: number;
  kind: ConsultKind;
  kind_display: string;
  is_instant: boolean;
  complaint: string;
  state: "waiting" | "active" | "closed";
  state_display: string;
  doctor_deadline: string | null;
  started_at: string | null;
  closes_at: string | null;
  closed_at: string | null;
  doctor_summary: string;
  appointment: Appointment;
  doctor: { short_id: string; slug: string; full_name: string; photo: string | null; specialty: string; gender: "male" | "female" };
  role: "doctor" | "patient";
  unread_hint: { from_doctor: boolean; text: string; at: string } | null;
  created_at: string;
};

export type ConsultMessage = { id: number; from_doctor: boolean; is_system: boolean; text: string; file: string | null; created_at: string };

export const KIND_META: Record<ConsultKind, { label: string; desc: string; tone: string }> = {
  phone: { label: "مشاوره تلفنی", desc: "تماس صوتی امن در مرورگر، در زمان انتخابی", tone: "bg-sky-50 text-sky-700 ring-sky-200" },
  text: { label: "مشاوره متنی", desc: "سؤال بنویسید، عکس و مدارک بفرستید؛ پاسخ تا ۲۴ ساعت", tone: "bg-violet-50 text-violet-700 ring-violet-200" },
  video: { label: "مشاوره ویدیویی", desc: "ویزیت تصویری در زمان انتخابی", tone: "bg-rose-50 text-rose-700 ring-rose-200" },
};

export const STATE_TONE: Record<string, string> = {
  waiting: "bg-amber-50 text-amber-700 ring-amber-200",
  active: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  closed: "bg-slate-100 text-slate-600 ring-slate-200",
};
