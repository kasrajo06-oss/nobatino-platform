import { CalendarClock, Check, MapPin, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BuyOffer from "@/components/offers/BuyOffer";
import { OfferVisual } from "@/components/offers/OfferCard";
import Avatar from "@/components/ui/Avatar";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/ui/JsonLd";
import { BRAND, SITE_URL } from "@/lib/config";
import { CenterIcon } from "@/lib/icons";
import { num, toman } from "@/lib/format";
import type { OfferDetail } from "@/lib/offers";
import { serverGetOrNull } from "@/lib/server-api";

type P = { params: Promise<{ slug: string }> };
const path = async (p: P["params"]) => encodeURIComponent(decodeURIComponent((await p).slug));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const o = await serverGetOrNull<OfferDetail>(`/offers/${await path(params)}/`, 120);
  return o ? { title: `${o.title} | ${o.provider_name}`, description: o.summary, alternates: { canonical: `/offer/${o.slug}` } } : {};
}

export default async function OfferPage({ params }: P) {
  const o = await serverGetOrNull<OfferDetail>(`/offers/${await path(params)}/`, 60);
  if (!o) notFound();
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ href: "/offer", label: `${BRAND} کلینیک` }, { href: `/offer?category=${o.category}`, label: o.category_display }, { label: o.title }]} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Offer", name: o.title, price: o.price * 10, priceCurrency: "IRR", url: `${SITE_URL}/offer/${o.slug}`, availability: "https://schema.org/InStock" }} />
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="relative aspect-[16/8] overflow-hidden rounded-3xl"><OfferVisual offer={o} className="absolute inset-0 size-full" /></div>
          <div>
            <span className="chip bg-rose-50 px-3 py-1.5 text-rose-600 ring-rose-100">{o.category_display}</span>
            <h1 className="mt-3 text-3xl font-black leading-[1.5] text-slate-900">{o.title}</h1>
            <p className="mt-3 text-lg leading-8 text-slate-600">{o.summary}</p>
          </div>
          <Link href={o.provider.url} className="card flex items-center gap-4 p-4 hover:border-brand-300">
            {o.provider.type === "doctor" ? (
              <Avatar src={o.provider.photo} name={o.provider_name} gender={o.provider.gender} size={56} />
            ) : (
              <span className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CenterIcon type={o.provider.center_type || "clinic"} className="size-8" /></span>
            )}
            <span>
              <b className="block text-slate-900">{o.provider_name}</b>
              <span className="text-sm text-brand-700">{o.provider.subtitle}</span>
            </span>
            <span className="ms-auto text-sm text-brand-700">مشاهده پروفایل ←</span>
          </Link>
          {o.includes.length > 0 && (
            <section className="card p-6">
              <h2 className="mb-4 text-lg font-extrabold">این پکیج شامل</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {o.includes.map((x) => <li key={x} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {x}</li>)}
              </ul>
            </section>
          )}
          <section className="card space-y-3 p-6 text-sm leading-8 text-slate-700">
            <h2 className="text-lg font-extrabold text-slate-900">توضیحات</h2>
            <p className="whitespace-pre-line">{o.description}</p>
            <p className="flex items-start gap-2"><MapPin className="mt-2 size-4 shrink-0 text-brand-600" /> {o.city.name}، {o.address}</p>
          </section>
          {o.terms && (
            <section className="card p-6 text-sm leading-8 text-slate-700">
              <h2 className="mb-2 text-lg font-extrabold text-slate-900">شرایط استفاده</h2>
              <ul className="list-disc space-y-1 ps-5">{o.terms.split("\n").filter(Boolean).map((t) => <li key={t}>{t}</li>)}</ul>
            </section>
          )}
        </div>
        <aside>
          <div className="card sticky top-24 space-y-5 p-6">
            <div className="flex items-end justify-between">
              <div>
                {o.discount_percent > 0 && <s className="text-sm text-slate-400">{toman(o.original_price)}</s>}
                <p className="text-3xl font-black text-slate-900">{toman(o.price)}</p>
              </div>
              {o.discount_percent > 0 && <span className="rounded-full bg-rose-500 px-3 py-1.5 text-sm font-black text-white">٪{num(o.discount_percent)}</span>}
            </div>
            <ul className="space-y-2 text-sm text-slate-600">
              <li className="flex items-center gap-2"><CalendarClock className="size-4 text-brand-600" /> اعتبار {num(o.valid_days)} روز پس از خرید</li>
              <li className="flex items-center gap-2"><ShoppingBag className="size-4 text-brand-600" /> {num(o.sold_count)} نفر خریده‌اند{o.remaining !== null && ` · ${num(o.remaining)} ظرفیت باقی‌مانده`}</li>
              <li className="flex items-center gap-2"><Check className="size-4 text-emerald-600" /> لغو و استرداد کامل تا قبل از استفاده</li>
            </ul>
            <BuyOffer slug={o.slug} soldOut={o.remaining === 0} />
          </div>
        </aside>
      </div>
    </div>
  );
}
