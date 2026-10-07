"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, get, patch } from "@/lib/api";
import { toEnDigits } from "@/lib/format";

type C = {
  name: string; address: string; phone: string; website: string; description: string; working_hours: string; is_24h: boolean;
  has_home_sampling: boolean; online_reception: boolean; reception_fee: number; home_sampling_fee: number;
  verification_status: string; verification_status_display: string; rejection_reason: string;
};

export default function CenterProfile() {
  const qc = useQueryClient();
  const center = useQuery({ queryKey: ["cp-profile"], queryFn: () => get<C>("/center-panel/profile/") });
  const [form, setForm] = useState<Partial<C>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => { if (center.data) setForm(center.data); }, [center.data]);
  if (!center.data) return null;
  const c = center.data;

  const save = async () => {
    try {
      const editable: (keyof C)[] = ["name", "address", "phone", "website", "description", "working_hours", "is_24h", "has_home_sampling", "online_reception", "reception_fee", "home_sampling_fee"];
      await patch("/center-panel/profile/", Object.fromEntries(editable.map((k) => [k, form[k]])));
      setMsg({ tone: "success", text: "ذخیره شد." });
      qc.invalidateQueries({ queryKey: ["cp-profile"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  const text = (k: keyof C, label: string) => (
    <label className="text-sm">{label}<input className="input mt-1" value={String(form[k] ?? "")} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></label>
  );
  const bool = (k: keyof C, label: string) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} /> {label}</label>
  );
  const money = (k: keyof C, label: string) => (
    <label className="text-sm">{label}<input className="input mt-1" dir="ltr" value={String(form[k] ?? 0)} onChange={(e) => setForm({ ...form, [k]: Number(toEnDigits(e.target.value)) || 0 })} /></label>
  );

  return (
    <>
      <PageTitle>اطلاعات مرکز</PageTitle>
      <div className="card mb-4 flex items-center gap-3 p-4 text-sm">
        وضعیت: <StatusChip status={c.verification_status} label={c.verification_status_display} />
        {c.rejection_reason && <span className="text-rose-600">{c.rejection_reason}</span>}
      </div>
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="card grid gap-3 p-5 sm:grid-cols-2">
        {text("name", "نام مرکز")}
        {text("phone", "تلفن")}
        {text("website", "وب‌سایت")}
        {text("working_hours", "ساعات کاری")}
        <label className="text-sm sm:col-span-2">آدرس<textarea className="input mt-1" value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></label>
        <label className="text-sm sm:col-span-2">درباره مرکز<textarea className="input mt-1" rows={4} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        {money("reception_fee", "هزینه رزرو پذیرش (تومان)")}
        {money("home_sampling_fee", "هزینه نمونه‌گیری در منزل (تومان)")}
        {bool("online_reception", "پذیرش آنلاین فعال")}
        {bool("has_home_sampling", "نمونه‌گیری در منزل")}
        {bool("is_24h", "شبانه‌روزی")}
        <button className="btn-primary sm:col-span-2" onClick={save}>ذخیره</button>
      </div>
    </>
  );
}
