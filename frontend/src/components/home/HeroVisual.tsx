import { DoctorFemale } from "healthicons-react/filled";
import { BadgeCheck, CalendarCheck, Star } from "lucide-react";

/** Product-style hero illustration built from UI pieces (no third-party imagery). */
export default function HeroVisual() {
  const times = ["۱۰:۳۰", "۱۱:۰۰", "۱۱:۳۰", "۱۲:۰۰", "۱۶:۰۰", "۱۶:۳۰"];
  return (
    <div className="relative mx-auto hidden w-full max-w-md lg:block" aria-hidden>
      <div className="absolute -top-10 -right-10 size-72 rounded-full bg-brand-200/50 blur-3xl" />
      <div className="absolute -bottom-10 -left-6 size-60 rounded-full bg-amber-200/50 blur-3xl" />
      <div className="relative rounded-3xl bg-white p-6 shadow-2xl shadow-brand-900/10 ring-1 ring-line">
        <div className="flex items-center gap-4">
          <div className="grid size-20 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-rose-50 to-pink-100 text-rose-400 ring-4 ring-white">
            <DoctorFemale className="mt-4 size-16" />
          </div>
          <div>
            <p className="text-lg font-extrabold text-slate-900">پزشک متخصص</p>
            <p className="text-sm text-brand-700">نوبت‌دهی اینترنتی مطب</p>
            <p className="mt-1 flex gap-0.5">{[0, 1, 2, 3, 4].map((i) => <Star key={i} className="size-4 fill-amber-400 text-amber-400" />)}</p>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          {["شنبه ۱۸", "یکشنبه ۱۹", "دوشنبه ۲۰"].map((d, i) => (
            <span key={d} className={`flex-1 rounded-xl border py-2 text-center text-xs ${i === 0 ? "border-brand-600 bg-brand-600 text-white" : "border-line text-slate-600"}`}>{d}</span>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {times.map((t, i) => (
            <span key={t} className={`rounded-lg border py-2 text-center text-sm font-semibold ${i === 2 ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "border-line text-slate-700"}`}>{t}</span>
          ))}
        </div>
        <div className="mt-5 rounded-xl bg-brand-600 py-3 text-center text-sm font-bold text-white">ثبت نوبت</div>
      </div>
      <div className="absolute -bottom-6 -right-8 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-line">
        <span className="grid size-10 place-items-center rounded-full bg-emerald-100 text-emerald-600"><CalendarCheck className="size-5" /></span>
        <span className="text-sm"><b className="block text-slate-900">نوبت شما ثبت شد</b><span className="text-xs text-muted">کد پیگیری پیامک شد</span></span>
      </div>
      <div className="absolute -top-5 -left-8 flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-xl ring-1 ring-line">
        <BadgeCheck className="size-5 text-brand-600" />
        <span className="text-xs font-semibold text-slate-700">پزشکان تأییدشده</span>
      </div>
    </div>
  );
}
