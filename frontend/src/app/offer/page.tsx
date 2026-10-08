import { BadgePercent, ShieldCheck, Ticket } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import OfferCard from "@/components/offers/OfferCard";
import OfferIcon from "@/components/offers/OfferIcon";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Empty from "@/components/ui/Empty";
import Pagination from "@/components/ui/Pagination";
import { BRAND } from "@/lib/config";
import { num } from "@/lib/format";
import type { Offer } from "@/lib/offers";
import { qs, serverGet } from "@/lib/server-api";
import type { City, Paginated } from "@/lib/types";

export const metadata: Metadata = {
  title: `${BRAND} کلینیک؛ خرید آنلاین خدمات پزشکی با تخفیف`,
  description: "خرید آنلاین خدمات دندانپزشکی، زیبایی، روانشناسی، چکاپ و فیزیوتراپی از پزشکان و مراکز معتبر با تخفیف.",
  alternates: { canonical: "/offer" },
};
export const dynamic = "force-dynamic";

type SP = { category?: string; city?: string; ordering?: string; page?: string };

export default async function OffersPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const [cats, list, cities] = await Promise.all([
    serverGet<{ key: string; label: string; count: number }[]>("/offers/categories/", { revalidate: 300 }),
    serverGet<Paginated<Offer>>(`/offers/${qs({ category: sp.category, city: sp.city, ordering: sp.ordering, page, page_size: 12 })}`, { revalidate: 60 }),
    serverGet<City[]>("/cities/?is_popular=true", { revalidate: 3600 }),
  ]);
  const href = (patch: Partial<SP>) => {
    const s = new URLSearchParams(Object.entries({ ...sp, page: undefined, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/offer${s.size ? `?${s}` : ""}`;
  };

  return (
    <>
      <section className="bg-gradient-to-br from-rose-50 via-white to-brand-50">
        <div className="container-page py-6">
          <Breadcrumbs items={[{ label: `${BRAND} کلینیک` }]} />
          <div className="grid items-center gap-10 py-10 lg:grid-cols-[1.3fr_1fr]">
            <div className="space-y-5">
              <h1 className="text-3xl font-black leading-tight text-slate-900 md:text-5xl">خدمات پزشکی و زیبایی<br /><span className="text-rose-500">با تخفیف ویژه</span></h1>
              <p className="max-w-xl text-lg leading-8 text-slate-600">پکیج خدمات را آنلاین بخرید، کد استفاده را دریافت کنید و در زمان دلخواه به پزشک یا مرکز مراجعه کنید.</p>
              <div className="flex flex-wrap gap-4 text-sm text-slate-700">
                <span className="flex items-center gap-2"><BadgePercent className="size-5 text-rose-500" /> تا ۴۰٪ تخفیف</span>
                <span className="flex items-center gap-2"><Ticket className="size-5 text-brand-600" /> کد استفاده فوری</span>
                <span className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-600" /> استرداد کامل قبل از استفاده</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {cats.filter((c) => c.count > 0).slice(0, 6).map((c) => (
                <Link key={c.key} href={href({ category: c.key })} className="flex flex-col items-center gap-2 rounded-3xl bg-white p-4 text-center ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg">
                  <span className="grid size-12 place-items-center rounded-2xl bg-rose-50 text-rose-500"><OfferIcon category={c.key} className="size-7" /></span>
                  <b className="text-xs text-slate-800">{c.label}</b>
                  <span className="text-[11px] text-muted">{num(c.count)} پکیج</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="container-page py-10">
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Link href={href({ category: undefined })} className={`chip shrink-0 px-4 py-2 text-sm ${!sp.category ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line"}`}>همه</Link>
            {cats.map((c) => (
              <Link key={c.key} href={href({ category: c.key })} className={`chip shrink-0 px-4 py-2 text-sm ${sp.category === c.key ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line"}`}>
                {c.label}
              </Link>
            ))}
          </div>
          <form action="/offer" className="flex gap-2">
            {sp.category && <input type="hidden" name="category" value={sp.category} />}
            <select name="city" defaultValue={sp.city} className="input w-36">
              <option value="">همه شهرها</option>
              {cities.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
            </select>
            <select name="ordering" defaultValue={sp.ordering} className="input w-36">
              <option value="">پرفروش‌ترین</option>
              <option value="cheapest">ارزان‌ترین</option>
              <option value="newest">جدیدترین</option>
            </select>
            <button className="btn-primary">اعمال</button>
          </form>
        </div>
        {list.results.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.results.map((o) => <OfferCard key={o.id} offer={o} />)}</div>
        ) : (
          <Empty title="پکیجی با این مشخصات پیدا نشد" />
        )}
        <Pagination page={page} count={list.count} pageSize={12} makeHref={(p) => href({ page: p > 1 ? String(p) : undefined })} />
      </div>
    </>
  );
}
