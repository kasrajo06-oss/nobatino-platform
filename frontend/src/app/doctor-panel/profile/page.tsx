"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, api, get, patch, post } from "@/lib/api";

type Profile = {
  short_id: string; slug: string; first_name: string; last_name: string; bio: string; photo: string | null; experience_start_year: number | null;
  offers_phone: boolean; offers_text: boolean; offers_video: boolean; verification_status: string; verification_status_display: string; rejection_reason: string;
};
type Doc = { id: number; kind: string; kind_display: string; file: string };
const KINDS = [["council_card", "کارت نظام پزشکی"], ["national_card", "کارت ملی"], ["degree", "مدرک تحصیلی"], ["office_license", "پروانه مطب"]];

export default function DoctorProfile() {
  const qc = useQueryClient();
  const profile = useQuery({ queryKey: ["dp-profile"], queryFn: () => get<Profile>("/doctor-panel/profile/") });
  const docs = useQuery({ queryKey: ["dp-docs"], queryFn: () => get<Doc[]>("/doctor-panel/documents/") });
  const [form, setForm] = useState<Partial<Profile>>({});
  const [msg, setMsg] = useState<{ tone: "success" | "error" | "info"; text: string } | null>(null);
  useEffect(() => { if (profile.data) setForm(profile.data); }, [profile.data]);
  const p = profile.data;
  if (!p) return null;

  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setMsg(null);
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      qc.invalidateQueries({ queryKey: ["dp-profile"] });
      qc.invalidateQueries({ queryKey: ["dp-docs"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  const uploadDoc = (kind: string, file: File) => {
    const fd = new FormData();
    fd.set("kind", kind);
    fd.set("file", file);
    return run(() => api("/doctor-panel/documents/", { method: "POST", body: fd }), "مدرک بارگذاری شد.");
  };
  const uploadPhoto = (file: File) => {
    const fd = new FormData();
    fd.set("photo", file);
    return run(() => api("/doctor-panel/profile/", { method: "PATCH", body: fd }), "عکس به‌روزرسانی شد.");
  };

  return (
    <>
      <PageTitle action={p.verification_status === "approved" ? <Link href={`/doctor/${p.slug}/${p.short_id}`} className="btn-outline py-2">مشاهده صفحه عمومی</Link> : undefined}>
        پروفایل و مدارک
      </PageTitle>
      <div className="card mb-4 flex flex-wrap items-center gap-3 p-4">
        <span className="text-sm">وضعیت احراز هویت:</span>
        <StatusChip status={p.verification_status} label={p.verification_status_display} />
        {p.rejection_reason && <span className="text-sm text-rose-600">دلیل: {p.rejection_reason}</span>}
        {["draft", "rejected"].includes(p.verification_status) && (
          <button className="btn-primary ms-auto py-2" onClick={() => run(() => post("/doctor-panel/submit/"), "پروفایل برای بررسی ارسال شد.")}>ارسال برای تأیید</button>
        )}
      </div>
      {msg && <div className="mb-4"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="card grid gap-3 p-5 sm:grid-cols-2">
        <label className="flex items-center gap-3 sm:col-span-2">
          {p.photo ? <img src={p.photo} alt="" className="size-16 rounded-full object-cover" /> : <span className="grid size-16 place-items-center rounded-full bg-slate-100 text-xs text-muted">عکس</span>}
          <span className="btn-outline cursor-pointer py-2">تغییر عکس<input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} /></span>
        </label>
        <input className="input" placeholder="نام" value={form.first_name ?? ""} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input className="input" placeholder="نام خانوادگی" value={form.last_name ?? ""} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input className="input" dir="ltr" placeholder="سال شروع طبابت (مثلاً ۱۳۹۰)" value={form.experience_start_year ?? ""} onChange={(e) => setForm({ ...form, experience_start_year: Number(e.target.value) || null })} />
        <div className="flex flex-wrap items-center gap-3 text-sm">
          {(["offers_phone", "offers_text", "offers_video"] as const).map((k) => (
            <label key={k} className="flex items-center gap-1.5"><input type="checkbox" className="accent-brand-600" checked={!!form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.checked })} />{{ offers_phone: "مشاوره تلفنی", offers_text: "متنی", offers_video: "ویدیویی" }[k]}</label>
          ))}
        </div>
        <textarea className="input sm:col-span-2" rows={5} placeholder="درباره من، سوابق و خدمات" value={form.bio ?? ""} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <button className="btn-primary sm:col-span-2" onClick={() => run(() => patch("/doctor-panel/profile/", { first_name: form.first_name, last_name: form.last_name, bio: form.bio, experience_start_year: form.experience_start_year, offers_phone: form.offers_phone, offers_text: form.offers_text, offers_video: form.offers_video }), "پروفایل ذخیره شد.")}>ذخیره</button>
      </div>
      <div className="card mt-5 p-5">
        <h2 className="mb-3 font-bold">مدارک</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {KINDS.map(([kind, label]) => {
            const existing = docs.data?.filter((d) => d.kind === kind) ?? [];
            return (
              <div key={kind} className="flex items-center gap-2 rounded-xl border border-line p-3 text-sm">
                <span className="flex-1">{label} {kind === "council_card" && <span className="text-rose-600">*</span>}</span>
                {existing.length > 0 && <a className="text-xs text-emerald-700" href={existing[0].file} target="_blank" rel="noreferrer">بارگذاری شده</a>}
                <span className="btn-ghost cursor-pointer py-1.5 text-brand-700">انتخاب فایل<input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files?.[0] && uploadDoc(kind, e.target.files[0])} /></span>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
