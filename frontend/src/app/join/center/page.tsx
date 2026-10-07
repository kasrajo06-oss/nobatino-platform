"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { ApiError, get, post } from "@/lib/api";
import type { City } from "@/lib/types";

const TYPES = [["laboratory", "آزمایشگاه"], ["clinic", "کلینیک"], ["hospital", "بیمارستان"], ["darmangah", "درمانگاه"], ["imaging", "مرکز تصویربرداری"], ["pharmacy", "داروخانه"]];

export default function JoinCenter() {
  const router = useRouter();
  const qc = useQueryClient();
  const cities = useQuery({ queryKey: ["cities-all"], queryFn: () => get<City[]>("/cities/") });
  const [form, setForm] = useState({ type: "laboratory", name: "", city: "", address: "", phone: "" });
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await post("/center-panel/onboarding/", { ...form, city: Number(form.city) });
      await qc.invalidateQueries({ queryKey: ["me"] });
      router.push("/center-panel/profile");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا");
    }
  };

  return (
    <div className="container-page max-w-2xl py-8">
      <form onSubmit={submit} className="card space-y-4 p-6">
        <h1 className="text-xl font-extrabold">ثبت‌نام مراکز درمانی</h1>
        <div className="grid gap-3 sm:grid-cols-2">
          <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <input className="input" placeholder="نام مرکز" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="input" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}>
            <option value="">شهر</option>
            {cities.data?.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.province_name})</option>)}
          </select>
          <input className="input" placeholder="تلفن" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <textarea className="input sm:col-span-2" placeholder="آدرس" required value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full">ثبت درخواست</button>
      </form>
    </div>
  );
}
