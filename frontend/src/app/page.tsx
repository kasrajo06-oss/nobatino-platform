import { CalendarCheck, FlaskConical, Hospital, ShieldCheck, Stethoscope } from "lucide-react";
import Link from "next/link";
import DoctorCard from "@/components/doctors/DoctorCard";
import SearchBox from "@/components/search/SearchBox";
import { BRAND } from "@/lib/config";
import { num } from "@/lib/format";
import { serverGet } from "@/lib/server-api";
import type { City, Condition, DoctorCard as Doctor, Specialty } from "@/lib/types";

// Rendered per request (data is still cached per fetch) so builds don't need a running API.
export const dynamic = "force-dynamic";

const SERVICES = [
  { href: "/doctors", icon: Stethoscope, title: "نوبت‌دهی مطب", text: "رزرو نوبت حضوری از پزشکان متخصص و عمومی" },
  { href: "/centers/type/laboratory", icon: FlaskConical, title: "آزمایشگاه آنلاین", text: "پذیرش بدون صف و نمونه‌گیری در منزل" },
  { href: "/centers", icon: Hospital, title: "مراکز درمانی", text: "بیمارستان، کلینیک، تصویربرداری و داروخانه" },
];

export default async function HomePage() {
  const [stats, cities, specialties, conditions, featured] = await Promise.all([
    serverGet<{ doctors: number; centers: number; appointments: number; cities: number }>("/stats/", { revalidate: 300 }),
    serverGet<City[]>("/cities/?is_popular=true", { revalidate: 3600 }),
    serverGet<Specialty[]>("/specialties/?is_popular=true", { revalidate: 3600 }),
    serverGet<Condition[]>("/conditions/?is_popular=true", { revalidate: 3600 }),
    serverGet<Doctor[]>("/doctors/featured/?has_free_slot=true", { revalidate: 300 }),
  ]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-canvas">
        <div className="container-page grid items-center gap-10 py-12 md:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-5xl">
              نوبت پزشک، <span className="text-brand-600">بدون صف</span> و در چند ثانیه
            </h1>
            <p className="mt-4 text-base text-slate-600 md:text-lg">
              جستجو بین {num(stats.doctors)} پزشک و {num(stats.centers)} مرکز درمانی در {num(stats.cities)} شهر
            </p>
          </div>
          <div className="mx-auto w-full max-w-3xl">
            <SearchBox cities={cities} large />
          </div>
          <div className="mx-auto grid w-full max-w-3xl grid-cols-3 gap-3 text-center">
            {[
              [stats.doctors, "پزشک"],
              [stats.appointments, "نوبت موفق"],
              [stats.cities, "شهر"],
            ].map(([n, l]) => (
              <div key={l} className="rounded-2xl bg-white/70 p-3 ring-1 ring-line">
                <div className="text-xl font-extrabold text-brand-700 md:text-2xl">{num(n)}+</div>
                <div className="text-xs text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page grid gap-4 py-10 md:grid-cols-3">
        {SERVICES.map(({ href, icon: Icon, title, text }) => (
          <Link key={href} href={href} className="card group flex items-center gap-4 p-5 transition hover:border-brand-300 hover:shadow-md">
            <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
              <Icon className="size-7" />
            </span>
            <span>
              <b className="block text-slate-900">{title}</b>
              <span className="text-sm text-muted">{text}</span>
            </span>
          </Link>
        ))}
      </section>

      <section className="container-page py-6">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">تخصص‌های پرمراجعه</h2>
          <Link href="/specialties" className="text-sm text-brand-700">همه تخصص‌ها</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {specialties.map((s) => (
            <Link key={s.id} href={`/doctors/expertise/${s.slug}`} className="card px-3 py-4 text-center text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:text-brand-700">
              {s.name}
            </Link>
          ))}
        </div>
      </section>

      {featured.length > 0 && (
        <section className="container-page py-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="text-xl font-bold">پزشکان منتخب با نوبت آزاد</h2>
            <Link href="/doctors?has_free_slot=true" className="text-sm text-brand-700">مشاهده همه پزشکان</Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {featured.slice(0, 6).map((d) => (
              <DoctorCard key={d.id} doctor={d} />
            ))}
          </div>
        </section>
      )}

      <section className="container-page grid gap-8 py-8 md:grid-cols-2">
        <div>
          <h2 className="mb-4 text-xl font-bold">جستجو بر اساس بیماری و خدمات</h2>
          <div className="flex flex-wrap gap-2">
            {conditions.map((c) => (
              <Link key={c.id} href={`/best-doctor/${c.slug}`} className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-slate-700 hover:border-brand-300 hover:text-brand-700">
                بهترین پزشک {c.name}
              </Link>
            ))}
          </div>
        </div>
        <div>
          <h2 className="mb-4 text-xl font-bold">شهرهای {BRAND}</h2>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {cities.map((c) => (
              <Link key={c.id} href={`/doctors/city/${c.slug}`} className="rounded-xl bg-white px-2 py-2 text-center text-sm text-slate-700 ring-1 ring-line hover:text-brand-700 hover:ring-brand-300">
                {c.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <div className="card grid gap-6 p-6 md:grid-cols-3">
          {[
            [CalendarCheck, "رزرو آنی", "نوبت شما بلافاصله ثبت و کد پیگیری پیامک می‌شود."],
            [ShieldCheck, "پزشکان تأییدشده", "مدارک و شماره نظام پزشکی همه پزشکان بررسی می‌شود."],
            [Hospital, "لغو آسان", "تا ۲۴ ساعت قبل از نوبت، لغو با بازگشت کامل وجه به کیف پول."],
          ].map(([Icon, t, d]) => {
            const I = Icon as typeof CalendarCheck;
            return (
              <div key={t as string} className="flex gap-3">
                <I className="size-8 shrink-0 text-brand-600" />
                <div>
                  <b>{t as string}</b>
                  <p className="mt-1 text-sm leading-6 text-muted">{d as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
