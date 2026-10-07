"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import { ApiError, del, get, post } from "@/lib/api";
import { faDigits } from "@/lib/format";
import type { FamilyMember } from "@/lib/types";

const RELATIONS: Record<string, string> = { child: "فرزند", spouse: "همسر", parent: "والدین", sibling: "خواهر/برادر", other: "سایر" };

export default function Family() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["family"], queryFn: () => get<FamilyMember[]>("/me/family/") });
  const empty = { first_name: "", last_name: "", national_code: "", gender: "female", relation: "child" };
  const [form, setForm] = useState(empty);
  const [error, setError] = useState("");

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await post("/me/family/", form);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["family"] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا");
    }
  };

  return (
    <>
      <PageTitle>اعضای خانواده</PageTitle>
      <div className="space-y-3">
        {list.data?.length ? (
          list.data.map((m) => (
            <div key={m.id} className="card flex items-center gap-3 p-4">
              <div className="flex-1">
                <b>{m.full_name}</b>
                <p className="text-xs text-muted">{RELATIONS[m.relation]} · کد ملی {faDigits(m.national_code)}</p>
              </div>
              <button className="btn-ghost p-2 text-rose-600" aria-label="حذف" onClick={async () => { await del(`/me/family/${m.id}/`); qc.invalidateQueries({ queryKey: ["family"] }); }}>
                <Trash2 className="size-4" />
              </button>
            </div>
          ))
        ) : (
          <Empty title="هنوز عضوی اضافه نکرده‌اید">با افزودن اعضای خانواده، برای آن‌ها هم نوبت بگیرید.</Empty>
        )}
      </div>
      <form onSubmit={add} className="card mt-5 grid gap-3 p-5 sm:grid-cols-2">
        <h2 className="font-bold sm:col-span-2">افزودن عضو جدید</h2>
        <input className="input" placeholder="نام" required value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input className="input" placeholder="نام خانوادگی" required value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input className="input" placeholder="کد ملی" dir="ltr" inputMode="numeric" maxLength={10} required value={form.national_code} onChange={(e) => setForm({ ...form, national_code: e.target.value })} />
        <select className="input" value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
          <option value="female">زن</option>
          <option value="male">مرد</option>
        </select>
        <select className="input sm:col-span-2" value={form.relation} onChange={(e) => setForm({ ...form, relation: e.target.value })}>
          {Object.entries(RELATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        {error && <div className="sm:col-span-2"><Alert tone="error">{error}</Alert></div>}
        <button className="btn-primary sm:col-span-2">افزودن</button>
      </form>
    </>
  );
}
