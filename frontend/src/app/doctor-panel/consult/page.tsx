"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import ConsultList from "@/components/panel/ConsultList";
import { PageTitle, Tabs } from "@/components/panel/PanelShell";
import ScheduleEditor from "@/components/panel/ScheduleEditor";
import Alert from "@/components/ui/Alert";
import { ApiError, get, post, api } from "@/lib/api";
import { KIND_META, type ConsultKind } from "@/lib/consult";
import { toEnDigits } from "@/lib/format";

type Svc = { kind: ConsultKind; price: number; duration_minutes: number; instant_enabled: boolean; is_active: boolean };
const KINDS: ConsultKind[] = ["text", "phone", "video"];

export default function DoctorConsult() {
  const [tab, setTab] = useState<"inbox" | "settings" | "schedule">("inbox");
  return (
    <>
      <PageTitle action={<OnlineToggle />}>مشاوره آنلاین</PageTitle>
      <Tabs value={tab} onChange={setTab} items={[["inbox", "صندوق مشاوره‌ها"], ["settings", "خدمات و تعرفه"], ["schedule", "زمان‌های تماس"]]} />
      {tab === "inbox" && <ConsultList endpoint="/doctor-panel/consultations/" asDoctor />}
      {tab === "settings" && <Services />}
      {tab === "schedule" && (
        <>
          <Alert>زمان‌هایی که برای مشاوره تلفنی و ویدیویی در دسترس هستید را تعیین کنید. بیماران فقط این زمان‌ها را می‌بینند.</Alert>
          <div className="mt-4"><ScheduleEditor schedulesPath="/doctor-panel/online-schedules" exceptionsPath="/doctor-panel/online-exceptions" /></div>
        </>
      )}
    </>
  );
}

function OnlineToggle() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["consult-services"], queryFn: () => get<{ services: Svc[]; is_online_now: boolean }>("/doctor-panel/consult-services/") });
  const online = data.data?.is_online_now ?? false;
  return (
    <button
      onClick={async () => { await post("/doctor-panel/presence/", { online: !online }); qc.invalidateQueries({ queryKey: ["consult-services"] }); }}
      className={`chip px-4 py-2 text-sm ${online ? "bg-emerald-50 text-emerald-700 ring-emerald-300" : "bg-slate-100 text-slate-600 ring-line"}`}
    >
      <span className={`size-2 rounded-full ${online ? "bg-emerald-500" : "bg-slate-400"}`} />
      {online ? "آنلاین برای مشاوره فوری" : "آفلاین"}
    </button>
  );
}

function Services() {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["consult-services"], queryFn: () => get<{ services: Svc[]; is_online_now: boolean }>("/doctor-panel/consult-services/") });
  const [rows, setRows] = useState<Svc[]>([]);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  useEffect(() => {
    if (!data.data) return;
    setRows(KINDS.map((k) => data.data!.services.find((s) => s.kind === k) ?? { kind: k, price: 0, duration_minutes: 15, instant_enabled: false, is_active: false }));
  }, [data.data]);

  const save = async () => {
    try {
      await api("/doctor-panel/consult-services/", { method: "PUT", body: { services: rows.filter((r) => r.is_active || r.price > 0) } });
      setMsg({ tone: "success", text: "تنظیمات ذخیره شد." });
      qc.invalidateQueries({ queryKey: ["consult-services"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  const update = (k: ConsultKind, patch: Partial<Svc>) => setRows((rs) => rs.map((r) => (r.kind === k ? { ...r, ...patch } : r)));

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.kind} className="card grid items-center gap-3 p-4 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
          <label className="flex items-center gap-3">
            <input type="checkbox" className="size-4 accent-brand-600" checked={r.is_active} onChange={(e) => update(r.kind, { is_active: e.target.checked })} />
            <span>
              <b className="block">{KIND_META[r.kind].label}</b>
              <span className="text-xs text-muted">{KIND_META[r.kind].desc}</span>
            </span>
          </label>
          <label className="text-xs text-muted">تعرفه (تومان)<input className="input mt-1" dir="ltr" value={r.price} onChange={(e) => update(r.kind, { price: Number(toEnDigits(e.target.value)) || 0 })} /></label>
          {r.kind !== "text" ? (
            <label className="text-xs text-muted">مدت تماس (دقیقه)<input className="input mt-1" dir="ltr" value={r.duration_minutes} onChange={(e) => update(r.kind, { duration_minutes: Number(toEnDigits(e.target.value)) || 15 })} /></label>
          ) : <span />}
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-amber-500" checked={r.instant_enabled} onChange={(e) => update(r.kind, { instant_enabled: e.target.checked })} /> فوری</label>
        </div>
      ))}
      {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
      <button className="btn-primary" onClick={save}>ذخیره تنظیمات</button>
    </div>
  );
}
