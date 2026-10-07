"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { ApiError, get, post } from "@/lib/api";
import type { Degree, Specialty } from "@/lib/types";
import { useMe } from "@/lib/use-me";

export default function JoinDoctor() {
  const router = useRouter();
  const qc = useQueryClient();
  const { data: me } = useMe();
  const specialties = useQuery({ queryKey: ["specialties-all"], queryFn: () => get<Specialty[]>("/specialties/") });
  const degrees = useQuery({ queryKey: ["degrees"], queryFn: () => get<Degree[]>("/degrees/") });
  const [form, setForm] = useState({ first_name: me?.first_name || "", last_name: me?.last_name || "", gender: "male", medical_council_no: "", degree: "", specialty: "" });
  const [error, setError] = useState("");

  if (me?.has_doctor_profile) {
    router.replace("/doctor-panel/profile");
    return null;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await post("/doctor-panel/onboarding/", {
        first_name: form.first_name, last_name: form.last_name, gender: form.gender, medical_council_no: form.medical_council_no,
        degree: Number(form.degree), specialties: [Number(form.specialty)], primary_specialty: Number(form.specialty),
      });
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.push("/doctor-panel/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا");
    }
  };

  return (
    <div className="container-page max-w-2xl py-8">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h1 className="text-xl font-extrabold">ثبت‌نام پزشکان</h1>
        <p className="text-sm leading-7 text-muted">پس از ثبت اطلاعات، مدارک و مطب خود را در پنل پزشک وارد کنید. پروفایل شما بعد از تأیید اپراتور در سایت نمایش داده می‌شود.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="input" placeholder="نام" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          <input className="input" placeholder="نام خانوادگی" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
            <option value="male">آقا</option>
            <option value="female">خانم</option>
          </select>
          <input className="input" placeholder="شماره نظام پزشکی" dir="ltr" required value={form.medical_council_no} onChange={(e) => setForm({ ...form, medical_council_no: e.target.value })} />
          <select className="input" required value={form.degree} onChange={(e) => setForm({ ...form, degree: e.target.value })}>
            <option value="">مدرک</option>
            {degrees.data?.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select className="input" required value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })}>
            <option value="">تخصص اصلی</option>
            {specialties.data?.map((s) => (
              <optgroup key={s.id} label={s.name}>
                <option value={s.id}>{s.name}</option>
                {s.children.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full">ثبت و ادامه</button>
      </form>
    </div>
  );
}
