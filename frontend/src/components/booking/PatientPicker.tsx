"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { ApiError, get, patch, post } from "@/lib/api";
import type { FamilyMember, User } from "@/lib/types";

/** Choose "myself" or a family member; lets the user complete their own profile inline. */
export default function PatientPicker({ me, value, onChange }: { me: User; value: number | null; onChange: (id: number | null) => void }) {
  const qc = useQueryClient();
  const family = useQuery({ queryKey: ["family"], queryFn: () => get<FamilyMember[]>("/me/family/") });
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ first_name: me.first_name, last_name: me.last_name, national_code: me.national_code, gender: me.gender || "female", relation: "child" });
  const [error, setError] = useState("");

  const saveSelf = async () => {
    setError("");
    try {
      await patch("/me/", { first_name: form.first_name, last_name: form.last_name, national_code: form.national_code, gender: form.gender });
      await qc.invalidateQueries({ queryKey: ["me"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ذخیره اطلاعات");
    }
  };

  const addMember = async () => {
    setError("");
    try {
      const m = await post<FamilyMember>("/me/family/", form);
      await qc.invalidateQueries({ queryKey: ["family"] });
      onChange(m.id);
      setAdding(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ثبت");
    }
  };

  const fields = (
    <div className="grid gap-2 sm:grid-cols-2">
      <input className="input" placeholder="نام" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
      <input className="input" placeholder="نام خانوادگی" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
      <input className="input ltr text-right" inputMode="numeric" placeholder="کد ملی" maxLength={10} value={form.national_code} onChange={(e) => setForm({ ...form, national_code: e.target.value })} />
      <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value as "male" | "female" })}>
        <option value="female">زن</option>
        <option value="male">مرد</option>
      </select>
    </div>
  );

  if (!me.profile_completed && value === null && !adding) {
    return (
      <div className="space-y-3">
        <Alert>برای ثبت نوبت، نام و کد ملی خود را تکمیل کنید.</Alert>
        {fields}
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full" onClick={saveSelf}>ذخیره اطلاعات من</button>
        <button className="btn-ghost w-full" onClick={() => setAdding(true)}>نوبت برای شخص دیگری است</button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {me.profile_completed && (
          <button onClick={() => onChange(null)} className={`chip px-3 py-2 ${value === null ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line"}`}>
            خودم ({me.full_name})
          </button>
        )}
        {family.data?.map((m) => (
          <button key={m.id} onClick={() => onChange(m.id)} className={`chip px-3 py-2 ${value === m.id ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line"}`}>
            {m.full_name}
          </button>
        ))}
        <button onClick={() => { setAdding((a) => !a); setForm({ first_name: "", last_name: "", national_code: "", gender: "female", relation: "child" }); }} className="chip bg-white px-3 py-2 text-brand-700 ring-brand-200">
          <UserPlus className="size-3.5" /> شخص دیگر
        </button>
      </div>
      {adding && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          {fields}
          <select className="input" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
            <option value="child">فرزند</option>
            <option value="spouse">همسر</option>
            <option value="parent">والدین</option>
            <option value="sibling">خواهر/برادر</option>
            <option value="other">سایر</option>
          </select>
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full" onClick={addMember}>افزودن و انتخاب</button>
        </div>
      )}
    </div>
  );
}
