"use client";

import { Building2, MapPin, Search, Stethoscope, Tag, UserRound } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { get } from "@/lib/api";
import type { City, Suggest } from "@/lib/types";

export default function SearchBox({ cities, defaultCity = "", large = false }: { cities: City[]; defaultCity?: string; large?: boolean }) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggest | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (q.trim().length < 2) {
      setData(null);
      return;
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q });
      if (city) params.set("city", city);
      get<Suggest>(`/search/suggest/?${params}`).then(setData).catch(() => setData(null));
    }, 250);
    return () => clearTimeout(t);
  }, [q, city]);

  useEffect(() => {
    const close = (e: MouseEvent) => !boxRef.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(city ? `/doctors/city/${city}${params.size ? `?${params}` : ""}` : `/doctors${params.size ? `?${params}` : ""}`);
  };

  const cityPrefix = city ? `/doctors/city/${city}` : "/doctors";
  const hasResults = data && (data.doctors.length || data.specialties.length || data.conditions.length || data.centers.length);

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} className={`flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-line sm:flex-row ${large ? "sm:p-2.5" : ""}`}>
        <label className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 sm:w-48">
          <MapPin className="size-4 shrink-0 text-brand-600" />
          <select value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none" aria-label="شهر">
            <option value="">همه شهرها</option>
            {cities.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 items-center gap-2 px-3">
          <Search className="size-4 shrink-0 text-slate-400" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder="نام پزشک، تخصص، بیماری یا مرکز درمانی..."
            className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
            aria-label="جستجو"
          />
        </label>
        <button className="btn-primary px-6 py-3">جستجو</button>
      </form>

      {open && hasResults ? (
        <div className="absolute inset-x-0 top-full z-30 mt-2 max-h-[60vh] overflow-y-auto rounded-2xl border border-line bg-white p-2 text-sm shadow-xl">
          {data!.specialties.map((s) => (
            <Link key={`s-${s.slug}`} href={`${cityPrefix}/expertise/${s.slug}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
              <Stethoscope className="size-4 text-brand-600" /> {s.name}
              <span className="ms-auto text-xs text-muted">تخصص</span>
            </Link>
          ))}
          {data!.conditions.map((c) => (
            <Link key={`c-${c.slug}`} href={`/best-doctor/${c.slug}${city ? `?city=${city}` : ""}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
              <Tag className="size-4 text-amber-600" /> {c.name}
              <span className="ms-auto text-xs text-muted">بیماری/خدمت</span>
            </Link>
          ))}
          {data!.doctors.map((d) => (
            <Link key={`d-${d.short_id}`} href={`/doctor/${d.slug}/${d.short_id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
              <UserRound className="size-4 text-slate-500" /> {d.full_name}
              <span className="ms-auto truncate text-xs text-muted">{d.specialty}</span>
            </Link>
          ))}
          {data!.centers.map((c) => (
            <Link key={`m-${c.slug}`} href={`/center/${c.slug}`} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50">
              <Building2 className="size-4 text-slate-500" /> {c.name}
              <span className="ms-auto text-xs text-muted">
                {c.type} · {c.city}
              </span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
