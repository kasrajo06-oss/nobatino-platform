"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { PageTitle, Tabs } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import { ApiError, api, del, get, post } from "@/lib/api";

type Kind = "specialties" | "conditions" | "insurances" | "cities" | "lab-tests";
const CONFIG: Record<Kind, { label: string; fields: [string, string][] }> = {
  specialties: { label: "تخصص‌ها", fields: [["name", "نام"], ["title", "عنوان پزشک"], ["slug", "اسلاگ"], ["parent", "شناسه والد"]] },
  conditions: { label: "بیماری‌ها", fields: [["name", "نام"], ["slug", "اسلاگ"], ["synonyms", "مترادف‌ها"]] },
  insurances: { label: "بیمه‌ها", fields: [["name", "نام"], ["slug", "اسلاگ"], ["kind", "نوع (basic/supplementary)"]] },
  cities: { label: "شهرها", fields: [["name", "نام"], ["slug", "اسلاگ"], ["province", "شناسه استان"]] },
  "lab-tests": { label: "آزمایش‌ها", fields: [["name", "نام"], ["en_name", "نام انگلیسی"], ["slug", "اسلاگ"], ["category", "دسته"]] },
};
type Row = Record<string, string | number | boolean | null | number[]> & { id: number };

export default function Catalog() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<Kind>("specialties");
  const [q, setQ] = useState("");
  const rows = useQuery({ queryKey: ["ops-catalog", kind, q], queryFn: () => get<Row[]>(`/ops/catalog/${kind}/?q=${encodeURIComponent(q)}`) });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const cfg = CONFIG[kind];
  const refresh = () => qc.invalidateQueries({ queryKey: ["ops-catalog", kind] });
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try { await fn(); refresh(); } catch (e) { setError(e instanceof ApiError ? e.message : "خطا"); }
  };

  return (
    <>
      <PageTitle>داده‌های مرجع</PageTitle>
      <Tabs value={kind} onChange={(k) => { setKind(k); setDraft({}); }} items={Object.entries(CONFIG).map(([k, v]) => [k as Kind, v.label])} />
      <input className="input mb-3" placeholder="جستجو..." value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <div className="mb-3"><Alert tone="error">{error}</Alert></div>}
      <div className="card mb-4 grid gap-2 p-3 sm:grid-cols-5">
        {cfg.fields.map(([f, l]) => <input key={f} className="input" placeholder={l} value={draft[f] ?? ""} onChange={(e) => setDraft({ ...draft, [f]: e.target.value })} />)}
        <button className="btn-primary" onClick={() => run(async () => { await post(`/ops/catalog/${kind}/`, Object.fromEntries(Object.entries(draft).filter(([, v]) => v !== ""))); setDraft({}); })}>افزودن</button>
      </div>
      <div className="card max-h-[60vh] divide-y divide-line overflow-y-auto">
        {rows.data?.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-2 p-3 text-sm">
            <span className="w-10 text-xs text-muted">#{r.id}</span>
            {cfg.fields.map(([f]) => (
              <input key={f} className="input flex-1 py-1.5" defaultValue={String(r[f] ?? "")} onBlur={(e) => e.target.value !== String(r[f] ?? "") && run(() => api(`/ops/catalog/${kind}/${r.id}/`, { method: "PATCH", body: { [f]: e.target.value || null } }))} aria-label={f} />
            ))}
            <button className="btn-ghost p-1.5 text-rose-600" aria-label="حذف" onClick={() => confirm("حذف شود؟") && run(() => del(`/ops/catalog/${kind}/${r.id}/`))}><Trash2 className="size-4" /></button>
          </div>
        ))}
      </div>
    </>
  );
}
