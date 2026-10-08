import { MapPin, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { num, toman } from "@/lib/format";
import { OFFER_TONES, type Offer } from "@/lib/offers";
import OfferIcon from "./OfferIcon";

export function OfferVisual({ offer, className = "" }: { offer: Offer; className?: string }) {
  return offer.cover ? (
    <img src={offer.cover} alt="" loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-gradient-to-br ${OFFER_TONES[offer.category]} text-white ${className}`}>
      <OfferIcon category={offer.category} className="size-16 opacity-90" />
    </div>
  );
}

export default function OfferCard({ offer: o }: { offer: Offer }) {
  return (
    <Link href={`/offer/${o.slug}`} className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line transition hover:-translate-y-1 hover:shadow-xl">
      <div className="relative aspect-[16/10] overflow-hidden">
        <OfferVisual offer={o} className="absolute inset-0 size-full transition duration-500 group-hover:scale-105" />
        {o.discount_percent > 0 && <span className="absolute top-4 left-4 rounded-full bg-rose-500 px-3 py-1 text-sm font-black text-white shadow">٪{num(o.discount_percent)} تخفیف</span>}
        <span className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800">{o.category_display}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-extrabold leading-8 text-slate-900 group-hover:text-brand-700">{o.title}</h3>
        <p className="mt-1 text-sm text-brand-700">{o.provider_name}</p>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-7 text-muted">{o.summary}</p>
        <p className="mt-3 flex items-center gap-1 text-xs text-muted"><MapPin className="size-3.5" /> {o.city.name}</p>
        <div className="mt-4 flex items-end justify-between border-t border-dashed border-line pt-4">
          <span className="flex items-center gap-1 text-xs text-muted"><ShoppingBag className="size-3.5" /> {num(o.sold_count)} خرید</span>
          <span className="text-left">
            {o.discount_percent > 0 && <s className="block text-xs text-slate-400">{toman(o.original_price)}</s>}
            <b className="text-lg text-slate-900">{toman(o.price)}</b>
          </span>
        </div>
      </div>
    </Link>
  );
}
