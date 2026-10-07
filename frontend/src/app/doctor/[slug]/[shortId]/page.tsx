import { BadgeCheck, CalendarClock, Clock, IdCard, MapPin, Phone, ThumbsUp, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import DoctorBooking from "@/components/booking/DoctorBooking";
import ReviewList from "@/components/doctors/ReviewList";
import Avatar from "@/components/ui/Avatar";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/ui/JsonLd";
import MapEmbed from "@/components/ui/MapEmbed";
import Stars from "@/components/ui/Stars";
import { SITE_URL } from "@/lib/config";
import { CONSULT_LABELS, faDigits, num, relativeSlot, toman } from "@/lib/format";
import { serverGet, serverGetOrNull } from "@/lib/server-api";
import type { DoctorDetail, Paginated, Review } from "@/lib/types";

type P = { params: Promise<{ slug: string; shortId: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { shortId } = await params;
  const d = await serverGetOrNull<DoctorDetail>(`/doctors/${shortId}/`, 60);
  if (!d) return {};
  const city = d.offices[0]?.city.name ?? "";
  return {
    title: `${d.full_name}، ${d.primary_specialty.title}${city ? ` در ${city}` : ""} | نوبت‌دهی آنلاین`,
    description: `رزرو نوبت اینترنتی ${d.full_name}، ${d.primary_specialty.title}. آدرس مطب، تلفن، نظرات بیماران و اولین نوبت خالی.`,
    alternates: { canonical: `/doctor/${d.slug}/${d.short_id}` },
  };
}

export default async function DoctorPage({ params }: P) {
  const { slug, shortId } = await params;
  const d = await serverGetOrNull<DoctorDetail>(`/doctors/${shortId}/`, 60);
  if (!d) notFound();
  if (decodeURIComponent(slug) !== d.slug) permanentRedirect(`/doctor/${encodeURIComponent(d.slug)}/${d.short_id}`);
  const reviews = await serverGet<Paginated<Review>>(`/doctors/${shortId}/reviews/`, { revalidate: 60 });
  const office = d.offices[0];
  const spec = d.primary_specialty;

  return (
    <div className="container-page py-6">
      <Breadcrumbs
        items={[
          { href: "/doctors", label: "پزشکان" },
          ...(office ? [{ href: `/doctors/city/${office.city.slug}`, label: office.city.name }] : []),
          { href: office ? `/doctors/city/${office.city.slug}/expertise/${spec.slug}` : `/doctors/expertise/${spec.slug}`, label: spec.name },
          { label: d.full_name },
        ]}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Physician",
          name: d.full_name,
          medicalSpecialty: spec.title,
          url: `${SITE_URL}/doctor/${d.slug}/${d.short_id}`,
          ...(d.photo ? { image: d.photo } : {}),
          ...(office ? { address: { "@type": "PostalAddress", streetAddress: office.address, addressLocality: office.city.name, addressCountry: "IR" }, telephone: office.phone } : {}),
          ...(d.review_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: d.rating_avg, reviewCount: d.review_count, bestRating: 5 } } : {}),
        }}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_400px]">
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex flex-col gap-5 sm:flex-row">
              <Avatar src={d.photo} name={d.full_name} size={112} />
              <div className="flex-1 space-y-2">
                <h1 className="text-2xl font-extrabold">{d.full_name}</h1>
                <p className="text-brand-700">{d.specialties.map((s) => s.title).join(" | ")}</p>
                <p className="flex items-center gap-1.5 text-sm text-muted">
                  <IdCard className="size-4" /> شماره نظام پزشکی: <span className="font-semibold text-slate-700">{faDigits(d.medical_council_no)}</span>
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-sm text-slate-600">
                  <Stars value={d.rating_avg} count={d.review_count} size="md" />
                  {d.review_count > 0 && <span className="inline-flex items-center gap-1"><ThumbsUp className="size-4 text-emerald-600" /> {num(d.recommend_pct)}٪ پیشنهاد</span>}
                  {d.successful_appointments > 0 && <span className="inline-flex items-center gap-1"><Users className="size-4" /> {num(d.successful_appointments)} نوبت موفق</span>}
                  {d.endorsement_count > 0 && <span className="inline-flex items-center gap-1"><BadgeCheck className="size-4 text-brand-600" /> تأیید {num(d.endorsement_count)} پزشک</span>}
                  {d.experience_years ? <span className="inline-flex items-center gap-1"><Clock className="size-4" /> {num(d.experience_years)} سال سابقه</span> : null}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {d.badges.map((b) => <span key={b.key} className="chip bg-emerald-50 text-emerald-700 ring-emerald-200">{b.label}</span>)}
                  {d.consult_types.map((t) => <span key={t} className="chip bg-slate-50 text-slate-600 ring-slate-200">{CONSULT_LABELS[t]}</span>)}
                </div>
              </div>
            </div>
            {d.bio && <p className="mt-5 border-t border-line pt-4 text-sm leading-8 text-slate-700">{d.bio}</p>}
          </section>

          {d.offices.map((o) => (
            <section key={o.id} className="card space-y-3 p-5">
              <h2 className="font-bold">{o.title}{o.center_slug && <Link className="ms-2 text-sm font-normal text-brand-700" href={`/center/${o.center_slug}`}>(صفحه مرکز)</Link>}</h2>
              <p className="flex gap-2 text-sm leading-7 text-slate-700"><MapPin className="mt-1.5 size-4 shrink-0 text-brand-600" /> {o.city.name}، {o.address}</p>
              {o.phone && <p className="flex items-center gap-2 text-sm"><Phone className="size-4 text-brand-600" /> <span className="ltr">{faDigits(o.phone)}</span></p>}
              {o.visit_fee > 0 && <p className="text-sm text-slate-600">هزینه ویزیت: {toman(o.visit_fee)}</p>}
              {o.insurances.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-sm text-muted">بیمه‌های طرف قرارداد:</span>
                  {o.insurances.map((i) => <span key={i.id} className="chip bg-brand-50 text-brand-700 ring-brand-100">{i.name}</span>)}
                </div>
              )}
              <MapEmbed lat={o.lat} lng={o.lng} title={o.title} />
            </section>
          ))}

          <section className="card p-5">
            <h2 className="mb-4 font-bold">نظرات بیماران ({num(d.review_count)})</h2>
            <ReviewList shortId={d.short_id} initial={reviews} />
          </section>

          {d.endorsers.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-4 font-bold">پزشکانی که {d.full_name} را تأیید کرده‌اند</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {d.endorsers.map((e) => (
                  <Link key={e.short_id} href={`/doctor/${e.slug}/${e.short_id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300">
                    <Avatar src={e.photo} name={e.full_name} size={44} />
                    <span className="min-w-0">
                      <b className="block truncate text-sm">{e.full_name}</b>
                      <span className="block truncate text-xs text-muted">{e.specialty}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside id="booking" className="scroll-mt-20">
          <div className="card sticky top-20 space-y-4 p-5">
            <h2 className="text-lg font-bold">دریافت نوبت</h2>
            {d.first_free_slot_at && (
              <p className="flex items-center gap-1.5 text-sm text-emerald-700">
                <CalendarClock className="size-4" /> اولین نوبت آزاد: {relativeSlot(d.first_free_slot_at)}
              </p>
            )}
            <DoctorBooking shortId={d.short_id} offices={d.offices} />
          </div>
        </aside>
      </div>
    </div>
  );
}
