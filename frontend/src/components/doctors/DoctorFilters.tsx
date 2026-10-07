"use client";

import { SlidersHorizontal, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import type { City, Insurance, Specialty } from "@/lib/types";

const TYPES = [
  ["", "همه"],
  ["in_person", "نوبت مطب"],
  ["phone", "تلفنی"],
  ["text", "متنی"],
  ["video", "ویدیویی"],
];

export const SORTS = [
  ["", "پیش‌فرض"],
  ["popular", "محبوب‌ترین"],
  ["nearest_slot", "نزدیک‌ترین نوبت آزاد"],
  ["most_successful", "بیشترین نوبت موفق"],
];

type Props = { specialties: Specialty[]; cities: City[]; insurances: Insurance[]; lockCity?: string; lockSpecialty?: string };

export default function DoctorFilters({ specialties, cities, insurances, lockCity, lockSpecialty }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(sp.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  /** Changing city/specialty moves to the SEO-friendly path instead of a query param. */
  const go = (city: string, specialty: string) => {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    let path = "/doctors";
    if (city) path += `/city/${city}`;
    if (specialty) path += `/expertise/${specialty}`;
    router.push(`${path}${next.size ? `?${next}` : ""}`);
  };

  const city = lockCity || "";
  const specialty = lockSpecialty || "";
  const panel = (
    <div className="space-y-5">
      <div>
        <span className="label">نوع نوبت</span>
        <div className="flex flex-wrap gap-1.5">
          {TYPES.map(([v, l]) => (
            <button
              key={v}
              onClick={() => set("appointment_type", v)}
              className={`chip px-3 py-1.5 ${(sp.get("appointment_type") || "") === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-line"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="f-city">شهر</label>
        <select id="f-city" className="input" value={city} onChange={(e) => go(e.target.value, specialty)}>
          <option value="">همه شهرها</option>
          {cities.map((c) => (
            <option key={c.id} value={c.slug}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-spec">تخصص و فوق تخصص</label>
        <select id="f-spec" className="input" value={specialty} onChange={(e) => go(city, e.target.value)}>
          <option value="">همه تخصص‌ها</option>
          {specialties.map((s) => (
            <optgroup key={s.id} label={s.name}>
              <option value={s.slug}>{s.name} (همه)</option>
              {s.children.map((c) => (
                <option key={c.id} value={c.slug}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="f-ins">بیمه</label>
        <select id="f-ins" className="input" value={sp.get("insurance") || ""} onChange={(e) => set("insurance", e.target.value)}>
          <option value="">فرقی نمی‌کند</option>
          {insurances.map((i) => (
            <option key={i.id} value={i.slug}>{i.name}</option>
          ))}
        </select>
      </div>
      <div>
        <span className="label">جنسیت پزشک</span>
        <div className="grid grid-cols-3 gap-1.5">
          {[["", "فرقی ندارد"], ["female", "خانم"], ["male", "آقا"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => set("gender", v)}
              className={`rounded-lg py-2 text-xs font-medium ring-1 ${(sp.get("gender") || "") === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-line"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm">
        فقط پزشکان دارای نوبت باز
        <input type="checkbox" className="size-4 accent-brand-600" checked={sp.get("has_free_slot") === "true"} onChange={(e) => set("has_free_slot", e.target.checked ? "true" : "")} />
      </label>
      <label className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 px-3 py-3 text-sm">
        مشاوره فوری
        <input type="checkbox" className="size-4 accent-brand-600" checked={sp.get("instant") === "true"} onChange={(e) => set("instant", e.target.checked ? "true" : "")} />
      </label>
    </div>
  );

  return (
    <>
      <button className="btn-outline w-full lg:hidden" onClick={() => setMobileOpen(true)}>
        <SlidersHorizontal className="size-4" /> فیلترها
      </button>
      <aside className="card sticky top-20 hidden p-4 lg:block">{panel}</aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-white p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <b>فیلترها</b>
              <button onClick={() => setMobileOpen(false)} aria-label="بستن"><X className="size-5" /></button>
            </div>
            {panel}
          </div>
        </div>
      )}
    </>
  );
}

export function SortBar() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const current = sp.get("ordering") || "";
  return (
    <div className="flex items-center gap-1 overflow-x-auto text-sm">
      <span className="shrink-0 text-muted">مرتب‌سازی:</span>
      {SORTS.map(([v, l]) => (
        <button
          key={v}
          onClick={() => {
            const next = new URLSearchParams(sp.toString());
            if (v) next.set("ordering", v);
            else next.delete("ordering");
            next.delete("page");
            router.push(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
          }}
          className={`shrink-0 rounded-lg px-3 py-1.5 ${current === v ? "bg-brand-50 font-semibold text-brand-700" : "text-slate-600 hover:bg-slate-100"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
