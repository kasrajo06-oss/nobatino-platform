"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import { ApiError, api, get, post } from "@/lib/api";
import { toEnDigits } from "@/lib/format";

type Row = { id: number; test: number; name: string; price: number; is_active: boolean };
type LabTest = { id: number; name: string; en_name: string };

export default function LabTests() {
  const qc = useQueryClient();
  const rows = useQuery({ queryKey: ["cp-tests"], queryFn: () => get<Row[]>("/center-panel/lab-tests/") });
  const catalog = useQuery({ queryKey: ["lab-test-catalog"], queryFn: () => get<LabTest[]>("/lab-tests/") });
  const [newTest, setNewTest] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [error, setError] = useState("");
  const refresh = () => qc.invalidateQueries({ queryKey: ["cp-tests"] });
  const missing = catalog.data?.filter((t) => !rows.data?.some((r) => r.test === t.id)) ?? [];

  return (
    <>
      <PageTitle>آزمایش‌ها و تعرفه</PageTitle>
      {error && <div className="mb-3"><Alert tone="error">{error}</Alert></div>}
      <div className="card divide-y divide-line">
        {rows.data?.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="flex-1">{r.name}</span>
            <input className="input w-36" dir="ltr" defaultValue={r.price} onBlur={async (e) => { await api(`/center-panel/lab-tests/${r.id}/`, { method: "PATCH", body: { price: Number(toEnDigits(e.target.value)) || 0 } }); refresh(); }} aria-label="قیمت" />
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" className="accent-brand-600" checked={r.is_active} onChange={async (e) => { await api(`/center-panel/lab-tests/${r.id}/`, { method: "PATCH", body: { is_active: e.target.checked } }); refresh(); }} /> فعال</label>
          </div>
        ))}
      </div>
      {missing.length > 0 && (
        <div className="card mt-4 flex flex-wrap gap-2 p-4">
          <select className="input flex-1" value={newTest} onChange={(e) => setNewTest(e.target.value)}>
            <option value="">افزودن آزمایش از کاتالوگ</option>
            {missing.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.en_name})</option>)}
          </select>
          <input className="input w-36" dir="ltr" placeholder="قیمت" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
          <button className="btn-primary" disabled={!newTest} onClick={async () => {
            try { await post("/center-panel/lab-tests/", { test: Number(newTest), price: Number(toEnDigits(newPrice)) || 0 }); setNewTest(""); setNewPrice(""); refresh(); }
            catch (e) { setError(e instanceof ApiError ? e.message : "خطا"); }
          }}>افزودن</button>
        </div>
      )}
    </>
  );
}
