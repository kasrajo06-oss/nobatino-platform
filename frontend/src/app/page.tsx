import { DoctorFemale, DoctorMale } from "healthicons-react/filled";
import { CalendarCheck, CreditCard, FlaskConical, Hospital, MessageSquareText, Phone, Quote, Search, ShieldCheck, Star, Stethoscope, Video, Zap } from "lucide-react";
import Link from "next/link";
import DoctorCard from "@/components/doctors/DoctorCard";
import ArticleCard from "@/components/magazine/ArticleCard";
import OfferCard from "@/components/offers/OfferCard";
import HeroVisual from "@/components/home/HeroVisual";
import Section from "@/components/home/Section";
import SearchBox from "@/components/search/SearchBox";
import { cityImage } from "@/lib/cities";
import { BRAND } from "@/lib/config";
import { num } from "@/lib/format";
import { getHome } from "@/lib/home";
import { CenterIcon, ConditionIcon, SpecialtyIcon } from "@/lib/icons";
import { serverGet } from "@/lib/server-api";
import type { ArticleCard as Article } from "@/lib/magazine";
import type { Offer } from "@/lib/offers";
import type { City, DoctorCard as Doctor, Paginated } from "@/lib/types";

// Rendered per request (data is still cached per fetch) so builds don't need a running API.
export const dynamic = "force-dynamic";

const SERVICES = [
  { href: "/doctors", icon: Stethoscope, title: "نوبت‌دهی مطب", text: "رزرو آنلاین نوبت حضوری از هزاران پزشک متخصص و عمومی", tone: "from-brand-500 to-brand-700" },
  { href: "/doctors/telehealth", icon: Video, title: "مشاوره آنلاین", text: "مشاوره تلفنی، متنی و ویدیویی؛ بدون رفت‌وآمد", tone: "from-violet-500 to-indigo-600" },
  { href: "/centers/type/laboratory", icon: FlaskConical, title: "آزمایشگاه آنلاین", text: "پذیرش بدون صف و نمونه‌گیری در منزل", tone: "from-amber-500 to-orange-600" },
  { href: "/centers", icon: Hospital, title: "مراکز درمانی", text: "بیمارستان، کلینیک، تصویربرداری و داروخانه", tone: "from-emerald-500 to-teal-600" },
];

const STEPS = [
  { icon: Search, title: "جستجو کنید", text: "پزشک یا مرکز درمانی را بر اساس شهر، تخصص یا بیماری پیدا کنید." },
  { icon: CalendarCheck, title: "زمان را انتخاب کنید", text: "روز و ساعت خالی را ببینید و برای خود یا خانواده رزرو کنید." },
  { icon: CreditCard, title: "رزرو قطعی", text: "پرداخت امن انجام می‌شود و کد پیگیری برایتان پیامک می‌شود." },
];

export default async function HomePage() {
  const [home, stats, cities, featured, offers, articles] = await Promise.all([
    getHome(),
    serverGet<{ doctors: number; centers: number; appointments: number; cities: number }>("/stats/", { revalidate: 300 }),
    serverGet<City[]>("/cities/?is_popular=true", { revalidate: 3600 }),
    serverGet<Doctor[]>("/doctors/featured/?has_free_slot=true", { revalidate: 300 }),
    serverGet<Paginated<Offer>>("/offers/?page_size=3", { revalidate: 300 }).catch(() => null),
    serverGet<Paginated<Article>>("/magazine/articles/?page_size=3", { revalidate: 300 }).catch(() => null),
  ]);
  const specialties = home?.specialties.filter((s) => s.is_popular) ?? [];
  const onlineSpecs = [...(home?.specialties ?? [])].sort((a, b) => b.online_count - a.online_count).slice(0, 6);
  const homeCities = home?.cities ?? [];
  const photoCities = homeCities.filter((c) => cityImage(c.slug)).slice(0, 8);
  const otherCities = homeCities.filter((c) => !photoCities.includes(c));
  const conditions = home?.conditions.filter((c) => c.is_popular) ?? [];

  return (
    <>
      {/* ---------- hero ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-canvas">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_10%,rgba(34,162,176,0.12),transparent_45%)]" />
        <div className="container-page relative grid items-center gap-12 py-14 md:py-20 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-8">
            <span className="chip bg-white px-4 py-2 text-brand-700 shadow-sm ring-brand-100">
              <ShieldCheck className="size-4" /> {num(stats.doctors)} پزشک تأییدشده در {num(stats.cities)} شهر
            </span>
            <h1 className="text-4xl font-black leading-[1.35] text-slate-900 md:text-5xl lg:text-[56px]">
              نوبت پزشک و مشاوره آنلاین،
              <br />
              <span className="bg-gradient-to-l from-brand-500 to-brand-700 bg-clip-text text-transparent">سریع و بدون صف</span>
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">بهترین پزشکان شهر خود را بر اساس نظر بیماران پیدا کنید، اولین نوبت خالی را ببینید و در چند ثانیه رزرو کنید.</p>
            <SearchBox cities={cities} large />
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">جستجوهای پرتکرار:</span>
              {["dermatology", "gynecology", "psychology", "dentistry", "cardiology"].map((slug) => {
                const s = home?.specialties.find((x) => x.slug === slug);
                return s ? <Link key={slug} href={`/doctors/expertise/${slug}`} className="rounded-full bg-white px-3 py-1 text-slate-700 ring-1 ring-line hover:text-brand-700">{s.name}</Link> : null;
              })}
            </div>
          </div>
          <HeroVisual />
        </div>
        <div className="container-page relative pb-14">
          <div className="grid grid-cols-2 gap-4 rounded-3xl bg-white p-6 shadow-sm ring-1 ring-line md:grid-cols-4">
            {[
              [stats.doctors, "پزشک فعال"],
              [stats.appointments, "نوبت موفق"],
              [stats.centers, "مرکز درمانی"],
              [stats.cities, "شهر"],
            ].map(([n, l]) => (
              <div key={l} className="text-center">
                <div className="text-2xl font-black text-brand-700 md:text-3xl">{num(n)}+</div>
                <div className="mt-1 text-sm text-muted">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- services ---------- */}
      <Section title="خدمات ما" subtitle={`هر آنچه برای مراقبت از سلامت شما و خانواده لازم است، در ${BRAND}.`}>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ href, icon: Icon, title, text, tone }) => (
            <Link key={href} href={href} className="group relative overflow-hidden rounded-3xl bg-white p-7 ring-1 ring-line transition hover:-translate-y-1 hover:shadow-xl">
              <span className={`grid size-16 place-items-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
                <Icon className="size-8" />
              </span>
              <h3 className="mt-6 text-lg font-extrabold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
              <span className="mt-5 inline-block text-sm font-semibold text-brand-700 transition group-hover:-translate-x-1">شروع کنید ←</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- specialties ---------- */}
      <Section title="تخصص‌های پرمراجعه" subtitle="بر اساس تخصص، بهترین پزشکان را با امتیاز و نظرات واقعی بیماران مقایسه کنید." more={{ href: "/specialties", label: "همه تخصص‌ها" }} tone="white">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {specialties.map((s) => (
            <Link key={s.slug} href={`/doctors/expertise/${s.slug}`} className="group flex flex-col items-center gap-3 rounded-3xl border border-line bg-white px-3 py-7 text-center transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-lg">
              <span className="grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                <SpecialtyIcon slug={s.slug} className="size-9" />
              </span>
              <b className="text-[15px] text-slate-800">{s.name}</b>
              <span className="text-xs text-muted">{num(s.doctor_count)} پزشک</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- online consultation band ---------- */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-800 via-brand-900 to-slate-900 py-16 text-white md:py-20">
        <div className="pointer-events-none absolute -left-20 -top-20 size-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="container-page relative grid items-center gap-12 lg:grid-cols-2">
          <div className="space-y-6">
            {(home?.online_now ?? 0) > 0 ? (
              <span className="chip bg-white/10 px-3 py-1.5 text-brand-100 ring-white/20">
                <span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-emerald-400" /></span>
                {num(home!.online_now)} پزشک همین حالا آنلاین
              </span>
            ) : (
              <span className="chip bg-white/10 px-3 py-1.5 text-brand-100 ring-white/20">مشاوره تلفنی، متنی و ویدیویی</span>
            )}
            <h2 className="text-3xl font-black leading-tight md:text-4xl">مشاوره آنلاین با پزشک، هر جا که هستید</h2>
            <p className="max-w-lg leading-8 text-brand-100">بدون ترافیک و انتظار در مطب؛ سؤال خود را بنویسید، تماس صوتی یا تصویری بگیرید و نسخه و توصیه پزشک را دریافت کنید.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                [Phone, "مشاوره تلفنی", "/doctors/telehealth/phone"],
                [MessageSquareText, "مشاوره متنی", "/doctors/telehealth/text"],
                [Video, "مشاوره ویدیویی", "/doctors/telehealth/video"],
                [Zap, "مشاوره فوری", "/doctors/telehealth?online_now=true"],
              ].map(([Icon, label, href]) => {
                const I = Icon as typeof Phone;
                return (
                  <Link key={label as string} href={href as string} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 transition hover:bg-white/20">
                    <I className="size-6 text-brand-200" /> <b>{label as string}</b>
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {onlineSpecs.map((s) => (
              <Link key={s.slug} href={`/doctors/telehealth?specialty=${s.slug}`} className="rounded-3xl bg-white p-5 text-center text-slate-900 transition hover:-translate-y-1">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600"><SpecialtyIcon slug={s.slug} className="size-8" /></span>
                <b className="mt-3 block text-sm">{s.name}</b>
                <span className="text-xs text-muted">{num(s.online_count)}+ پزشک آنلاین</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- featured doctors ---------- */}
      {featured.length > 0 && (
        <Section title="پزشکان منتخب با نوبت آزاد" subtitle="پزشکانی با بیشترین رضایت بیماران که همین حالا نوبت خالی دارند." more={{ href: "/doctors?has_free_slot=true", label: "مشاهده همه پزشکان" }}>
          <div className="grid gap-5 md:grid-cols-2">
            {featured.slice(0, 6).map((d) => <DoctorCard key={d.id} doctor={d} />)}
          </div>
        </Section>
      )}

      {/* ---------- cities ---------- */}
      <Section title={`شهرهای ${BRAND}`} subtitle="نوبت‌دهی اینترنتی پزشکان و مراکز درمانی در شهرهای سراسر کشور." tone="white">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {photoCities.map((c, i) => (
            <Link
              key={c.slug}
              href={`/doctors/city/${c.slug}`}
              className={`group relative overflow-hidden rounded-3xl ${i === 0 ? "col-span-2 row-span-2 min-h-80" : "min-h-44"}`}
            >
              <img src={cityImage(c.slug)!} alt={`پزشکان ${c.name}`} loading="lazy" className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                <b className={`block ${i === 0 ? "text-3xl" : "text-xl"} font-black`}>{c.name}</b>
                <span className="text-sm text-white/80">{num(c.doctor_count)} پزشک</span>
              </div>
            </Link>
          ))}
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {otherCities.map((c) => (
            <Link key={c.slug} href={`/doctors/city/${c.slug}`} className="flex flex-col items-center rounded-2xl border border-line bg-white px-2 py-4 text-center transition hover:border-brand-300 hover:text-brand-700">
              <b className="text-sm text-slate-800">{c.name}</b>
              <span className="mt-1 text-xs text-muted">{num(c.doctor_count)} پزشک</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- conditions ---------- */}
      <Section title="جستجو بر اساس بیماری و خدمات" subtitle="نمی‌دانید به کدام متخصص مراجعه کنید؟ بیماری یا خدمت موردنظر را انتخاب کنید تا بهترین پزشکان مرتبط را ببینید.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {conditions.map((c) => (
            <Link key={c.slug} href={`/best-doctor/${c.slug}`} className="group flex items-center gap-4 rounded-2xl bg-white p-4 ring-1 ring-line transition hover:shadow-lg hover:ring-amber-300">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600 transition group-hover:bg-amber-500 group-hover:text-white">
                <ConditionIcon slug={c.slug} className="size-7" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted">بهترین پزشک</span>
                <b className="block truncate text-sm text-slate-800">{c.name}</b>
              </span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- centers ---------- */}
      <Section title="مراکز درمانی" subtitle="اطلاعات تماس، بیمه‌ها، پزشکان و پذیرش آنلاین مراکز درمانی." more={{ href: "/centers", label: "همه مراکز" }} tone="white">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {home?.center_types.map((t) => (
            <Link key={t.type} href={`/centers/type/${t.type}`} className="group flex flex-col items-center gap-3 rounded-3xl border border-line p-6 text-center transition hover:border-brand-300 hover:shadow-lg">
              <span className="grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 transition group-hover:bg-emerald-600 group-hover:text-white"><CenterIcon type={t.type} className="size-9" /></span>
              <b className="text-slate-800">{t.label}</b>
              <span className="text-xs text-muted">{num(t.count)} مرکز</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* ---------- clinic offers ---------- */}
      {offers && offers.results.length > 0 && (
        <Section title={`${BRAND} کلینیک`} subtitle="خدمات دندانپزشکی، زیبایی، روانشناسی و چکاپ را آنلاین و با تخفیف بخرید." more={{ href: "/offer", label: "همه پکیج‌ها" }}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{offers.results.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
        </Section>
      )}

      {/* ---------- how it works ---------- */}
      <Section title="نوبت گرفتن در سه قدم">
        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map(({ icon: Icon, title, text }, i) => (
            <div key={title} className="relative rounded-3xl bg-white p-8 ring-1 ring-line">
              <span className="absolute left-6 top-6 text-5xl font-black text-brand-100">{num(i + 1)}</span>
              <span className="grid size-14 place-items-center rounded-2xl bg-brand-600 text-white"><Icon className="size-7" /></span>
              <h3 className="mt-5 text-lg font-extrabold">{title}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- testimonials ---------- */}
      {home && home.testimonials.length > 0 && (
        <Section title={`${BRAND} از نگاه بیماران`} subtitle="نظرات ثبت‌شده پس از مراجعه واقعی به پزشک." tone="white">
          <div className="grid gap-5 md:grid-cols-3">
            {home.testimonials.slice(0, 3).map((t, i) => (
              <figure key={i} className="flex flex-col rounded-3xl bg-canvas p-7 ring-1 ring-line">
                <Quote className="size-8 text-brand-300" />
                <blockquote className="mt-4 flex-1 leading-8 text-slate-700">{t.text}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-line pt-4 text-sm">
                  <span className="flex text-amber-400">{Array.from({ length: t.rating }).map((_, j) => <Star key={j} className="size-4 fill-current" />)}</span>
                  <b>{t.author}</b>
                  {t.doctor && <Link href={t.doctor_url} className="ms-auto truncate text-xs text-brand-700">{t.doctor}</Link>}
                </figcaption>
              </figure>
            ))}
          </div>
        </Section>
      )}

      {/* ---------- magazine ---------- */}
      {articles && articles.results.length > 0 && (
        <Section title="مجله سلامت" subtitle="راهنمای درمان و نکات سلامت با بازبینی پزشکان." more={{ href: "/mag", label: "همه مقالات" }}>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{articles.results.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
        </Section>
      )}

      {/* ---------- join CTA ---------- */}
      <section className="py-14 md:py-20">
        <div className="container-page">
          <div className="relative grid items-center gap-8 overflow-hidden rounded-[2rem] bg-gradient-to-l from-brand-600 to-brand-800 p-8 text-white md:grid-cols-[1fr_auto] md:p-12">
            <div className="pointer-events-none absolute -bottom-10 left-10 flex gap-4 opacity-20">
              <DoctorMale className="size-48" />
              <DoctorFemale className="size-48" />
            </div>
            <div className="relative space-y-3">
              <h2 className="text-2xl font-black md:text-3xl">پزشک یا مدیر مرکز درمانی هستید؟</h2>
              <p className="max-w-xl leading-8 text-brand-100">نوبت‌دهی آنلاین، مشاوره از راه دور، مدیریت برنامه کاری و تسویه حساب، همه در یک پنل.</p>
            </div>
            <div className="relative flex flex-wrap gap-3">
              <Link href="/join/doctor" className="btn bg-white px-6 py-3 text-brand-800 hover:bg-brand-50">ثبت‌نام پزشکان</Link>
              <Link href="/join/center" className="btn px-6 py-3 text-white ring-1 ring-white/40 hover:bg-white/10">ثبت‌نام مراکز</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
