"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import { ApiError, api, get } from "@/lib/api";
import { toEnDigits, toman } from "@/lib/format";
import type { City, Insurance } from "@/lib/types";

type Office = {
  id?: number; title: string; city: number | ""; city_name?: string; address: string; phone: string; visit_fee: number; booking_fee: number;
  booking_enabled: boolean; notes: string; insurances: number[]; is_active: boolean; lat: string | null; lng: string | null;
};
const EMPTY: Office = { title: "مطب", city: "", address: "", phone: "", visit_fee: 0, booking_fee: 0, booking_enabled: true, notes: "", insurances: [], is_active: true, lat: null, lng: null };

export default function Offices() {
  const qc = useQueryClient();
  const offices = useQuery({ queryKey: ["dp-offices"], queryFn: () => get<Office[]>("/doctor-panel/offices/") });
  const cities = useQuery({ queryKey: ["cities-all"], queryFn: () => get<City[]>("/cities/") });
  const insurances = useQuery({ queryKey: ["insurances"], queryFn: () => get<Insurance[]>("/insurances/") });
  const [editing, setEditing] = useState<Office | null>(null);
  const [error, setError] = useState("");

  const save = async () => {
    if (!editing) return;
    setError("");
    try {
      await api(`/doctor-panel/offices/${editing.id ? `${editing.id}/` : ""}`, { method: editing.id ? "PATCH" : "POST", body: editing });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["dp-offices"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };

  return (
    <>
      <PageTitle action={<button className="btn-primary py-2" onClick={() => setEditing({ ...EMPTY })}>افزودن مطب</button>}>مطب‌ها</PageTitle>
      <div className="space-y-3">
        {offices.data?.map((o) => (
          <div key={o.id} className="card flex flex-wrap items-center gap-3 p-4">
            <div className="flex-1">
              <b>{o.title} - {o.city_name}</b>
              <p className="text-xs text-muted">{o.address}</p>
              <p className="text-xs text-muted">ویزیت {toman(o.visit_fee)} · پیش‌پرداخت {toman(o.booking_fee)} · {o.booking_enabled ? "نوبت‌دهی آنلاین فعال" : "نوبت‌دهی غیرفعال"}</p>
            </div>
            <button className="btn-outline py-2" onClick={() => setEditing(o)}>ویرایش</button>
          </div>
        ))}
      </div>
      {editing && (
        <div className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
          <h2 className="font-bold sm:col-span-2">{editing.id ? "ویرایش مطب" : "مطب جدید"}</h2>
          <input className="input" placeholder="عنوان" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <select className="input" value={editing.city} onChange={(e) => setEditing({ ...editing, city: Number(e.target.value) })}>
            <option value="">شهر</option>
            {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.province_name})</option>)}
          </select>
          <textarea className="input sm:col-span-2" placeholder="آدرس کامل" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          <input className="input" dir="ltr" placeholder="تلفن مطب" value={editing.phone} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="input" dir="ltr" placeholder="عرض جغرافیایی" value={editing.lat ?? ""} onChange={(e) => setEditing({ ...editing, lat: e.target.value || null })} />
            <input className="input" dir="ltr" placeholder="طول جغرافیایی" value={editing.lng ?? ""} onChange={(e) => setEditing({ ...editing, lng: e.target.value || null })} />
          </div>
          <label className="text-sm">هزینه ویزیت (تومان)<input className="input mt-1" dir="ltr" value={editing.visit_fee} onChange={(e) => setEditing({ ...editing, visit_fee: Number(toEnDigits(e.target.value)) || 0 })} /></label>
          <label className="text-sm">پیش‌پرداخت آنلاین (تومان)<input className="input mt-1" dir="ltr" value={editing.booking_fee} onChange={(e) => setEditing({ ...editing, booking_fee: Number(toEnDigits(e.target.value)) || 0 })} /></label>
          <div className="sm:col-span-2">
            <span className="label">بیمه‌های طرف قرارداد</span>
            <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
              {insurances.data?.map((i) => {
                const on = editing.insurances.includes(i.id);
                return (
                  <button key={i.id} type="button" onClick={() => setEditing({ ...editing, insurances: on ? editing.insurances.filter((x) => x !== i.id) : [...editing.insurances, i.id] })} className={`chip px-2.5 py-1.5 ${on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-line"}`}>
                    {i.name}
                  </button>
                );
              })}
            </div>
          </div>
          <input className="input sm:col-span-2" placeholder="توضیحات برای بیمار (مثلاً مدارک لازم)" value={editing.notes} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={editing.booking_enabled} onChange={(e) => setEditing({ ...editing, booking_enabled: e.target.checked })} /> نوبت‌دهی آنلاین فعال</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> مطب فعال</label>
          {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" onClick={save}>ذخیره</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>انصراف</button>
          </div>
        </div>
      )}
    </>
  );
}
