const faNumber = new Intl.NumberFormat("fa-IR");

export function faDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

export function toman(amount: number): string {
  return `${faNumber.format(amount)} تومان`;
}

export function num(n: number | string): string {
  return faNumber.format(Number(n));
}

const dateFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", year: "numeric", month: "long", day: "numeric" });
const dateTimeFmt = new Intl.DateTimeFormat("fa-IR", {
  timeZone: "Asia/Tehran",
  weekday: "long",
  year: "numeric",
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", hour: "2-digit", minute: "2-digit" });
const shortFmt = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", month: "short", day: "numeric", weekday: "short" });

export const faDate = (iso: string) => dateFmt.format(new Date(iso));
export const faDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));
export const faTime = (iso: string) => timeFmt.format(new Date(iso));
export const faShort = (iso: string) => shortFmt.format(new Date(iso));

/** "امروز ساعت ۱۶:۰۰" / "فردا ..." / "سه‌شنبه ۲۰ مهر" for the nearest-free-slot label. */
export function relativeSlot(iso: string): string {
  const d = new Date(iso);
  const tehran = (x: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(x);
  const today = tehran(new Date());
  const tomorrow = tehran(new Date(Date.now() + 86400000));
  const day = tehran(d);
  const prefix = day === today ? "امروز" : day === tomorrow ? "فردا" : shortFmt.format(d);
  return `${prefix} ساعت ${timeFmt.format(d)}`;
}

export function toEnDigits(s: string): string {
  return s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export const CONSULT_LABELS: Record<string, string> = {
  in_person: "نوبت مطب",
  phone: "مشاوره تلفنی",
  text: "مشاوره متنی",
  video: "مشاوره ویدیویی",
};

export const ROLE_LABELS: Record<string, string> = {
  patient: "بیمار",
  doctor: "پزشک",
  center_staff: "مرکز درمانی",
  operator: "اپراتور",
  superadmin: "مدیر کل",
};

export const STATUS_TONE: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-700 ring-amber-200",
  confirmed: "bg-brand-50 text-brand-700 ring-brand-200",
  attended: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  no_show: "bg-slate-100 text-slate-600 ring-slate-200",
  cancelled: "bg-rose-50 text-rose-700 ring-rose-200",
  expired: "bg-slate-100 text-slate-500 ring-slate-200",
  pending: "bg-amber-50 text-amber-700 ring-amber-200",
  approved: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-700 ring-rose-200",
  draft: "bg-slate-100 text-slate-600 ring-slate-200",
  requested: "bg-amber-50 text-amber-700 ring-amber-200",
  paid: "bg-emerald-50 text-emerald-700 ring-emerald-200",
};
