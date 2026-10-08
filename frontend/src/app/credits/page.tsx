import type { Metadata } from "next";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { CITY_CREDITS } from "@/lib/cities";

export const metadata: Metadata = { title: "منابع تصاویر" };

export default function Credits() {
  return (
    <div className="container-page max-w-4xl py-8">
      <Breadcrumbs items={[{ label: "منابع تصاویر" }]} />
      <div className="card mt-4 space-y-4 p-6 text-sm leading-7">
        <h1 className="text-2xl font-extrabold">منابع و مجوز تصاویر</h1>
        <p className="text-muted">
          تصاویر شهرها از Wikimedia Commons با مجوزهای آزاد استفاده شده‌اند. آیکون‌های پزشکی از مجموعه آزاد Health Icons (CC0) هستند.
        </p>
        <ul className="divide-y divide-line">
          {Object.entries(CITY_CREDITS).map(([slug, c]) => (
            <li key={slug} className="flex flex-wrap items-center gap-2 py-2">
              <img src={`/images/cities/${slug}.jpg`} alt="" className="h-10 w-16 rounded object-cover" />
              <a href={c.source} target="_blank" rel="noreferrer" className="ltr text-brand-700">{c.title.replace(/^File:/, "")}</a>
              <span className="ltr text-xs text-muted">{c.author}</span>
              <a href={c.license_url || c.source} target="_blank" rel="noreferrer" className="chip bg-slate-50 text-slate-600 ring-line">{c.license}</a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
