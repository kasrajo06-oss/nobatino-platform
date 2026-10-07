"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import { ApiError, get, patch } from "@/lib/api";
import { faDigits } from "@/lib/format";
import type { Insurance } from "@/lib/types";
import { useMe } from "@/lib/use-me";

export default function Profile() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const insurances = useQuery({ queryKey: ["insurances"], queryFn: () => get<Insurance[]>("/insurances/") });
  const [form, setForm] = useState({ first_name: "", last_name: "", national_code: "", gender: "", birth_date: "", email: "", insurance: "" });
  const [status, setStatus] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (me) setForm({ first_name: me.first_name, last_name: me.last_name, national_code: me.national_code, gender: me.gender, birth_date: me.birth_date || "", email: me.email, insurance: me.insurance ? String(me.insurance) : "" });
  }, [me]);
  if (!me) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await patch("/me/", { ...form, birth_date: form.birth_date || null, insurance: form.insurance ? Number(form.insurance) : null });
      await qc.invalidateQueries({ queryKey: ["me"] });
      setStatus({ tone: "success", text: "اطلاعات ذخیره شد." });
    } catch (err) {
      setStatus({ tone: "error", text: err instanceof ApiError ? err.message : "خطا" });
    }
  };
  const field = (k: keyof typeof form, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label className="label" htmlFor={k}>{label}</label>
      <input id={k} className="input" value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} {...props} />
    </div>
  );

  return (
    <>
      <PageTitle>اطلاعات کاربری</PageTitle>
      <form onSubmit={save} className="card grid gap-4 p-5 sm:grid-cols-2">
        <div className="sm:col-span-2 text-sm text-muted">موبایل: <b className="text-slate-800">{faDigits(me.mobile)}</b></div>
        {field("first_name", "نام")}
        {field("last_name", "نام خانوادگی")}
        {field("national_code", "کد ملی", { inputMode: "numeric", maxLength: 10, dir: "ltr" })}
        <div>
          <label className="label" htmlFor="gender">جنسیت</label>
          <select id="gender" className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="">انتخاب کنید</option>
            <option value="female">زن</option>
            <option value="male">مرد</option>
          </select>
        </div>
        {field("birth_date", "تاریخ تولد (میلادی)", { type: "date", dir: "ltr" })}
        {field("email", "ایمیل (اختیاری)", { type: "email", dir: "ltr" })}
        <div className="sm:col-span-2">
          <label className="label" htmlFor="insurance">بیمه پایه</label>
          <select id="insurance" className="input" value={form.insurance} onChange={(e) => setForm({ ...form, insurance: e.target.value })}>
            <option value="">بدون بیمه</option>
            {insurances.data?.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        {status && <div className="sm:col-span-2"><Alert tone={status.tone}>{status.text}</Alert></div>}
        <div className="sm:col-span-2"><button className="btn-primary">ذخیره</button></div>
      </form>
    </>
  );
}
