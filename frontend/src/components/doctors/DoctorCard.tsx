import { BadgeCheck, CalendarClock, MapPin, ThumbsUp, Users } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Stars from "@/components/ui/Stars";
import { CONSULT_LABELS, num, relativeSlot, toman } from "@/lib/format";
import type { DoctorCard as Doctor } from "@/lib/types";

export default function DoctorCard({ doctor: d }: { doctor: Doctor }) {
  const url = `/doctor/${d.slug}/${d.short_id}`;
  return (
    <article className="card p-4 transition hover:shadow-md sm:p-5">
      <div className="flex gap-4">
        <Link href={url}>
          <Avatar src={d.photo} name={d.full_name} size={76} />
        </Link>
        <div className="min-w-0 flex-1 space-y-1.5">
          <Link href={url} className="block">
            <h3 className="truncate text-base font-bold text-slate-900 hover:text-brand-700">{d.full_name}</h3>
          </Link>
          <p className="text-sm text-brand-700">{d.primary_specialty.title}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            <Stars value={d.rating_avg} count={d.review_count} />
            {d.review_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <ThumbsUp className="size-3.5" /> {num(d.recommend_pct)}٪ پیشنهاد
              </span>
            )}
            {d.successful_appointments > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {num(d.successful_appointments)} نوبت موفق
              </span>
            )}
            {d.endorsement_count > 0 && (
              <span className="inline-flex items-center gap-1">
                <BadgeCheck className="size-3.5" /> تأیید {num(d.endorsement_count)} پزشک
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {d.badges.map((b) => (
          <span key={b.key} className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">
            {b.label}
          </span>
        ))}
        {d.consult_types.map((t) => (
          <span key={t} className="chip bg-slate-50 text-slate-600 ring-slate-200">
            {CONSULT_LABELS[t]}
          </span>
        ))}
        {d.insurances.slice(0, 2).map((i) => (
          <span key={i} className="chip bg-brand-50 text-brand-700 ring-brand-100">
            بیمه {i.replace(/^بیمه\s*/, "")}
          </span>
        ))}
      </div>

      {d.main_office && (
        <p className="mt-3 flex items-start gap-1.5 text-xs leading-6 text-slate-600">
          <MapPin className="mt-1 size-3.5 shrink-0 text-slate-400" />
          <span className="line-clamp-1">
            {d.main_office.address}
            {d.offices_count > 1 && <span className="text-brand-700"> (+{num(d.offices_count - 1)} مطب دیگر)</span>}
          </span>
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3 border-t border-dashed border-line pt-3 sm:flex-row sm:items-center">
        <div className="flex-1 text-xs">
          {d.first_free_slot_at ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CalendarClock className="size-4" /> اولین نوبت آزاد: <b>{relativeSlot(d.first_free_slot_at)}</b>
            </span>
          ) : (
            <span className="text-muted">فعلاً نوبت آزاد ندارد</span>
          )}
          {d.main_office?.visit_fee ? <span className="ms-3 text-muted">ویزیت: {toman(d.main_office.visit_fee)}</span> : null}
        </div>
        <div className="flex gap-2">
          <Link href={url} className="btn-outline flex-1 py-2 sm:flex-none">
            مشاهده پروفایل
          </Link>
          {d.first_free_slot_at && (
            <Link href={`${url}#booking`} className="btn-primary flex-1 py-2 sm:flex-none">
              نوبت بگیرید
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
