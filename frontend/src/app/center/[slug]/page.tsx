import { Clock, Globe, MapPin, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LabBooking from "@/components/booking/LabBooking";
import { CENTER_TYPES } from "@/components/centers/CenterListPage";
import Avatar from "@/components/ui/Avatar";
import { CenterIcon } from "@/lib/icons";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/ui/JsonLd";
import MapEmbed from "@/components/ui/MapEmbed";
import Stars from "@/components/ui/Stars";
import { SITE_URL } from "@/lib/config";
import { num, toman } from "@/lib/format";
import { serverGetOrNull } from "@/lib/server-api";
import type { CenterDetail } from "@/lib/types";

type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { slug } = await params;
  const c = await serverGetOrNull<CenterDetail>(`/centers/${encodeURIComponent(decodeURIComponent(slug))}/`, 120);
  return c ? { title: `${c.name} ${c.city.name}`, description: `آدرس، تلفن، ساعات کاری${c.online_reception ? " و پذیرش آنلاین" : ""} ${c.name}` } : {};
}

export default async function CenterPage({ params }: P) {
  const { slug } = await params;
  const c = await serverGetOrNull<CenterDetail>(`/centers/${encodeURIComponent(decodeURIComponent(slug))}/`, 120);
  if (!c) notFound();
  const schemaType = c.type === "hospital" ? "Hospital" : c.type === "pharmacy" ? "Pharmacy" : c.type === "laboratory" ? "DiagnosticLab" : "MedicalClinic";

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ href: "/centers", label: "مراکز درمانی" }, { href: `/centers/type/${c.type}`, label: CENTER_TYPES[c.type] }, { label: c.name }]} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": schemaType,
          name: c.name,
          url: `${SITE_URL}/center/${c.slug}`,
          telephone: c.phone,
          address: { "@type": "PostalAddress", streetAddress: c.address, addressLocality: c.city.name, addressCountry: "IR" },
          ...(c.review_count ? { aggregateRating: { "@type": "AggregateRating", ratingValue: c.rating_avg, reviewCount: c.review_count } } : {}),
        }}
      />
      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <section className="card p-5">
            <div className="flex gap-4">
              {c.logo ? (
                <Avatar src={c.logo} name={c.name} size={88} className="rounded-2xl" />
              ) : (
                <span className="grid size-22 shrink-0 place-items-center rounded-3xl bg-emerald-50 text-emerald-600"><CenterIcon type={c.type} className="size-12" /></span>
              )}
              <div className="space-y-1.5">
                <h1 className="text-2xl font-extrabold">{c.name}</h1>
                <p className="text-sm text-brand-700">{c.type_display}{c.is_public_sector ? " · دولتی" : " · خصوصی"}</p>
                <Stars value={c.rating_avg} count={c.review_count} />
              </div>
            </div>
            <div className="mt-5 space-y-2 border-t border-line pt-4 text-sm text-slate-700">
              <p className="flex gap-2"><MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" /> {c.city.name}، {c.address}</p>
              {c.phone && <p className="flex gap-2"><Phone className="size-4 text-brand-600" /> <span className="ltr">{c.phone}</span></p>}
              {c.working_hours && <p className="flex gap-2"><Clock className="size-4 text-brand-600" /> {c.is_24h ? "شبانه‌روزی" : c.working_hours}</p>}
              {c.website && <p className="flex gap-2"><Globe className="size-4 text-brand-600" /> <a className="ltr text-brand-700" href={c.website} rel="nofollow noreferrer" target="_blank">{c.website}</a></p>}
            </div>
            {c.description && <p className="mt-4 text-sm leading-7 text-slate-700">{c.description}</p>}
          </section>

          {c.insurances.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-bold">بیمه‌های طرف قرارداد</h2>
              <div className="flex flex-wrap gap-1.5">{c.insurances.map((i) => <span key={i.id} className="chip bg-brand-50 text-brand-700 ring-brand-100">{i.name}</span>)}</div>
            </section>
          )}

          {c.specialties.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-bold">بخش‌ها و تخصص‌ها</h2>
              <div className="flex flex-wrap gap-1.5">{c.specialties.map((s) => <span key={s.id} className="chip bg-slate-50 text-slate-700 ring-line">{s.name}</span>)}</div>
            </section>
          )}

          {c.doctors.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-bold">پزشکان این مرکز</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {c.doctors.map((d) => (
                  <Link key={d.short_id} href={`/doctor/${d.slug}/${d.short_id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 hover:border-brand-300">
                    <Avatar src={d.photo} name={d.full_name} size={44} gender={d.gender} />
                    <span className="min-w-0">
                      <b className="block truncate text-sm">{d.full_name}</b>
                      <span className="block truncate text-xs text-muted">{d.specialty}</span>
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {c.lab_tests.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-3 font-bold">تعرفه آزمایش‌ها ({num(c.lab_tests.length)})</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-xs text-muted"><tr><th className="py-2 text-right">آزمایش</th><th className="text-right">ناشتایی</th><th className="text-left">قیمت آزاد</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {c.lab_tests.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2">{t.name} <span className="ltr text-xs text-muted">{t.en_name}</span></td>
                        <td>{t.fasting_hours ? `${num(t.fasting_hours)} ساعت` : "—"}</td>
                        <td className="text-left">{toman(t.price)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <MapEmbed lat={c.lat} lng={c.lng} title={c.name} />
        </div>

        <aside>
          <div className="card sticky top-20 space-y-4 p-5">
            {c.online_reception ? (
              <>
                <h2 className="text-lg font-bold">پذیرش آنلاین</h2>
                <LabBooking center={c} />
              </>
            ) : (
              <>
                <h2 className="text-lg font-bold">اطلاعات تماس</h2>
                <p className="text-sm leading-7 text-muted">این مرکز پذیرش آنلاین ندارد. برای نوبت با شماره مرکز تماس بگیرید یا از پزشکان این مرکز نوبت بگیرید.</p>
                {c.phone && <a href={`tel:${c.phone}`} className="btn-primary w-full">تماس با مرکز</a>}
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
