import { BadgeCheck, CalendarClock, MapPin, MessageSquareText, Phone, ThumbsUp, Users, Video } from "lucide-react";
import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Stars from "@/components/ui/Stars";
import { CONSULT_LABELS, num, relativeSlot, toman } from "@/lib/format";
import type { DoctorCard as Doctor } from "@/lib/types";

const SERVICE_ICON = { phone: Phone, text: MessageSquareText, video: Video };

export default function DoctorCard({ doctor: d, telehealth = false }: { doctor: Doctor; telehealth?: boolean }) {
  const url = `/doctor/${d.slug}/${d.short_id}`;
  return (
    <article className="card p-5 transition hover:-translate-y-0.5 hover:shadow-lg sm:p-6">
      <div className="flex gap-4">
        <Link href={url} className="relative shrink-0">
          <Avatar src={d.photo} name={d.full_name} size={84} gender={d.gender} />
          {d.available_now && (
            <span className="absolute bottom-1 left-1 flex size-4 items-center justify-center rounded-full bg-white" title="آنلاین">
              <span className="size-3 animate-pulse rounded-full bg-emerald-500" />
            </span>
          )}
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

      {d.consult_services?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {d.consult_services.map((s) => {
            const Icon = SERVICE_ICON[s.kind];
            return (
              <span key={s.kind} className="inline-flex items-center gap-1.5 rounded-xl bg-slate-50 px-3 py-1.5 text-xs text-slate-700 ring-1 ring-line">
                <Icon className="size-3.5 text-brand-600" /> {s.kind_display.replace("مشاوره ", "")}
                <b className="text-slate-900">{toman(s.price)}</b>
              </span>
            );
          })}
        </div>
      )}

      {!telehealth && d.main_office && (
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
          {telehealth ? (
            d.available_now ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700"><span className="size-2 rounded-full bg-emerald-500" /> آنلاین؛ آماده مشاوره فوری</span>
            ) : d.first_online_slot_at ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700"><CalendarClock className="size-4" /> اولین زمان تماس: <b>{relativeSlot(d.first_online_slot_at)}</b></span>
            ) : (
              <span className="text-muted">پاسخ مشاوره متنی حداکثر ظرف ۲۴ ساعت</span>
            )
          ) : d.first_free_slot_at ? (
            <span className="inline-flex items-center gap-1.5 text-emerald-700">
              <CalendarClock className="size-4" /> اولین نوبت آزاد: <b>{relativeSlot(d.first_free_slot_at)}</b>
            </span>
          ) : (
            <span className="text-muted">فعلاً نوبت آزاد ندارد</span>
          )}
          {!telehealth && d.main_office?.visit_fee ? <span className="ms-3 text-muted">ویزیت: {toman(d.main_office.visit_fee)}</span> : null}
        </div>
        <div className="flex gap-2">
          <Link href={url} className="btn-outline flex-1 py-2 sm:flex-none">
            مشاهده پروفایل
          </Link>
          {telehealth ? (
            <Link href={`${url}#booking`} className="btn-primary flex-1 py-2 sm:flex-none">مشاوره آنلاین</Link>
          ) : (
            d.first_free_slot_at && (
              <Link href={`${url}#booking`} className="btn-primary flex-1 py-2 sm:flex-none">
                نوبت بگیرید
              </Link>
            )
          )}
        </div>
      </div>
    </article>
  );
}
