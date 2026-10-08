"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PenLine, Plus, Ticket } from "lucide-react";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, api, get, post } from "@/lib/api";
import { faDate, toEnDigits, toman } from "@/lib/format";
import type { PackageOrder } from "@/lib/offers";
import type { City } from "@/lib/types";
import { Tabs } from "./PanelShell";

type Pkg = {
  id?: number; title: string; category: string; city: number | ""; address: string; summary: string; description: string;
  includes: string; terms: string; original_price: number; price: number; valid_days: number; capacity: number | null;
  max_per_user: number; is_active: boolean; status?: string; status_display?: string; rejection_reason?: string; sold_count?: number;
};
const EMPTY: Pkg = { title: "", category: "dentistry", city: "", address: "", summary: "", description: "", includes: "", terms: "", original_price: 0, price: 0, valid_days: 90, capacity: null, max_per_user: 3, is_active: true };
const CATS = [["dentistry", "دندانپزشکی"], ["beauty", "پوست، مو و زیبایی"], ["psychology", "روانشناسی و مشاوره"], ["checkup", "چکاپ و آزمایش"], ["physio", "فیزیوتراپی"], ["nutrition", "تغذیه و لاغری"], ["other", "سایر"]];

/** Packages tab for doctor (`/doctor-panel/packages`) and center (`/center-panel/packages`) panels. */
export default function ProviderPackages({ base }: { base: string }) {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"redeem" | "packages" | "orders">("redeem");
  const pkgs = useQuery({ queryKey: ["provider-pkgs", base], queryFn: () => get<Pkg[]>(`${base}/`) });
  const orders = useQuery({ queryKey: ["provider-pkg-orders", base], queryFn: () => get<PackageOrder[]>(`${base}/orders/`), enabled: tab === "orders" });
  const cities = useQuery({ queryKey: ["cities-all"], queryFn: () => get<City[]>("/cities/") });
  const [editing, setEditing] = useState<Pkg | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const redeem = async () => {
    setMsg(null);
    try {
      const o = await post<PackageOrder>(`${base}/redeem/`, { voucher_code: toEnDigits(code) });
      setMsg({ tone: "success", text: `کد معتبر است و ثبت شد: «${o.package.title}» برای ${o.buyer_name} (${o.buyer_mobile}).` });
      setCode("");
      qc.invalidateQueries({ queryKey: ["provider-pkg-orders", base] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  const save = async () => {
    if (!editing) return;
    setMsg(null);
    try {
      await api(`${base}/${editing.id ? `${editing.id}/` : ""}`, { method: editing.id ? "PATCH" : "POST", body: editing });
      setMsg({ tone: "success", text: "ذخیره شد و پس از تأیید اپراتور نمایش داده می‌شود." });
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["provider-pkgs", base] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  const num = (k: keyof Pkg, label: string) => (
    <label className="text-sm">{label}<input className="input mt-1" dir="ltr" value={String(editing?.[k] ?? "")} onChange={(e) => setEditing({ ...editing!, [k]: Number(toEnDigits(e.target.value)) || 0 })} /></label>
  );

  return (
    <>
      <Tabs value={tab} onChange={(t) => { setTab(t); setMsg(null); }} items={[["redeem", "ثبت استفاده (کد)"], ["packages", "پکیج‌های من"], ["orders", "فروش‌ها"]]} />
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {tab === "redeem" && (
        <div className="card mx-auto max-w-md space-y-4 p-6 text-center">
          <Ticket className="mx-auto size-10 text-brand-600" />
          <p className="text-sm text-muted">کد استفاده‌ای که بیمار ارائه می‌دهد را وارد کنید تا خدمت ثبت شود.</p>
          <input className="input ltr py-3 text-center text-xl font-black tracking-[0.3em]" maxLength={10} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" aria-label="کد استفاده" />
          <button className="btn-primary w-full" onClick={redeem} disabled={code.length < 6}>بررسی و ثبت استفاده</button>
        </div>
      )}
      {tab === "packages" && !editing && (
        <div className="space-y-3">
          <button className="btn-primary" onClick={() => setEditing({ ...EMPTY })}><Plus className="size-4" /> پکیج جدید</button>
          {pkgs.data?.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1">
                <b>{p.title}</b>
                <p className="text-xs text-muted">{toman(p.price)} (به جای {toman(p.original_price)}) · {p.sold_count} فروش</p>
                {p.rejection_reason && <p className="text-xs text-rose-600">دلیل رد: {p.rejection_reason}</p>}
              </div>
              <StatusChip status={p.status === "approved" ? "approved" : p.status === "rejected" ? "rejected" : "pending"} label={p.status_display || ""} />
              <button className="btn-ghost p-2" aria-label="ویرایش" onClick={() => setEditing(p)}><PenLine className="size-4" /></button>
            </div>
          ))}
        </div>
      )}
      {tab === "packages" && editing && (
        <div className="card grid gap-3 p-5 sm:grid-cols-2">
          <input className="input sm:col-span-2" placeholder="عنوان پکیج" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
          <select className="input" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
            {CATS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="input" value={editing.city} onChange={(e) => setEditing({ ...editing, city: Number(e.target.value) })}>
            <option value="">شهر</option>
            {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input className="input sm:col-span-2" placeholder="آدرس محل ارائه خدمت" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} />
          <input className="input sm:col-span-2" placeholder="خلاصه (یک خط)" value={editing.summary} onChange={(e) => setEditing({ ...editing, summary: e.target.value })} />
          <textarea className="input sm:col-span-2" rows={4} placeholder="توضیحات کامل" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          <textarea className="input" rows={4} placeholder="شامل (هر خط یک مورد)" value={editing.includes} onChange={(e) => setEditing({ ...editing, includes: e.target.value })} />
          <textarea className="input" rows={4} placeholder="شرایط استفاده (هر خط یک مورد)" value={editing.terms} onChange={(e) => setEditing({ ...editing, terms: e.target.value })} />
          {num("original_price", "قیمت اصلی (تومان)")}
          {num("price", "قیمت با تخفیف (تومان)")}
          {num("valid_days", "اعتبار (روز)")}
          {num("max_per_user", "حداکثر خرید هر نفر")}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={editing.is_active} onChange={(e) => setEditing({ ...editing, is_active: e.target.checked })} /> فعال</label>
          <div className="flex gap-2 sm:col-span-2">
            <button className="btn-primary" onClick={save}>ذخیره و ارسال برای تأیید</button>
            <button className="btn-ghost" onClick={() => setEditing(null)}>انصراف</button>
          </div>
        </div>
      )}
      {tab === "orders" && (
        <div className="card divide-y divide-line">
          {orders.data?.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <b className="flex-1">{o.package.title}</b>
              <span>{o.buyer_name}</span>
              <span className="ltr text-xs text-muted">{o.voucher_code}</span>
              <span>{toman(o.paid_amount)}</span>
              <span className="text-xs text-muted">{o.used_at ? `استفاده: ${faDate(o.used_at)}` : o.paid_at && faDate(o.paid_at)}</span>
              <StatusChip status={o.status === "used" ? "attended" : o.status === "paid" ? "approved" : "cancelled"} label={o.status_display} />
            </div>
          ))}
          {!orders.data?.length && <p className="p-6 text-center text-sm text-muted">فروشی ثبت نشده است.</p>}
        </div>
      )}
    </>
  );
}
