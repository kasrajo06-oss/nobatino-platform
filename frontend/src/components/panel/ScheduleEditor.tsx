"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import { ApiError, del, get, post } from "@/lib/api";
import { faDate, faDigits } from "@/lib/format";

const WEEKDAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];
type Sched = { id: number; weekday: number; weekday_display: string; start_time: string; end_time: string; slot_minutes: number; capacity: number };
type Exc = { id: number; date: string; start_time: string | null; end_time: string | null; reason: string };

/** Weekly working hours + leave days. `base` = "/doctor-panel" or "/center-panel"; `office` scopes doctor schedules. */
export default function ScheduleEditor({ base, office }: { base: string; office?: number }) {
  const qc = useQueryClient();
  const q = office ? `?office=${office}` : "";
  const schedules = useQuery({ queryKey: ["schedules", base, office], queryFn: () => get<Sched[]>(`${base}/schedules/${q}`) });
  const exceptions = useQuery({ queryKey: ["exceptions", base, office], queryFn: () => get<Exc[]>(`${base}/exceptions/`) });
  const [form, setForm] = useState({ weekday: "0", start_time: "16:00", end_time: "20:00", slot_minutes: "15", capacity: "1" });
  const [leave, setLeave] = useState({ date: "", start_time: "", end_time: "", reason: "" });
  const [error, setError] = useState("");
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["schedules", base] });
    qc.invalidateQueries({ queryKey: ["exceptions", base] });
  };
  const run = async (fn: () => Promise<unknown>) => {
    setError("");
    try {
      await fn();
      refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };

  return (
    <div className="space-y-5">
      {error && <Alert tone="error">{error}</Alert>}
      <div className="card overflow-x-auto p-4">
        <h2 className="mb-3 font-bold">ساعات کاری هفتگی</h2>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted"><tr><th className="py-2 text-right">روز</th><th className="text-right">از</th><th className="text-right">تا</th><th className="text-right">مدت نوبت</th><th className="text-right">ظرفیت</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {schedules.data?.map((s) => (
              <tr key={s.id}>
                <td className="py-2">{s.weekday_display}</td>
                <td>{faDigits(s.start_time.slice(0, 5))}</td>
                <td>{faDigits(s.end_time.slice(0, 5))}</td>
                <td>{faDigits(s.slot_minutes)} دقیقه</td>
                <td>{faDigits(s.capacity)}</td>
                <td className="text-left"><button className="btn-ghost p-1.5 text-rose-600" aria-label="حذف" onClick={() => run(() => del(`${base}/schedules/${s.id}/`))}><Trash2 className="size-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-line pt-4 sm:grid-cols-6">
          <select className="input" value={form.weekday} onChange={(e) => setForm({ ...form, weekday: e.target.value })} aria-label="روز">
            {WEEKDAYS.map((w, i) => <option key={i} value={i}>{w}</option>)}
          </select>
          <input type="time" className="input" dir="ltr" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} aria-label="از ساعت" />
          <input type="time" className="input" dir="ltr" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} aria-label="تا ساعت" />
          <select className="input" value={form.slot_minutes} onChange={(e) => setForm({ ...form, slot_minutes: e.target.value })} aria-label="مدت نوبت">
            {[5, 10, 15, 20, 30, 45, 60].map((m) => <option key={m} value={m}>{faDigits(m)} دقیقه</option>)}
          </select>
          <input type="number" min={1} max={20} className="input" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} aria-label="ظرفیت" />
          <button className="btn-primary" onClick={() => run(() => post(`${base}/schedules/`, { ...form, weekday: Number(form.weekday), slot_minutes: Number(form.slot_minutes), capacity: Number(form.capacity), ...(office ? { office } : {}) }))}>افزودن</button>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 font-bold">مرخصی و تعطیلی</h2>
        <div className="space-y-2">
          {exceptions.data?.map((x) => (
            <div key={x.id} className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span className="flex-1">{faDate(x.date)} — {x.start_time ? `${faDigits(x.start_time.slice(0, 5))} تا ${faDigits(x.end_time!.slice(0, 5))}` : "کل روز"} {x.reason && `(${x.reason})`}</span>
              <button className="btn-ghost p-1.5 text-rose-600" aria-label="حذف" onClick={() => run(() => del(`${base}/exceptions/${x.id}/`))}><Trash2 className="size-4" /></button>
            </div>
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          <input type="date" className="input" dir="ltr" value={leave.date} onChange={(e) => setLeave({ ...leave, date: e.target.value })} aria-label="تاریخ" />
          <input type="time" className="input" dir="ltr" value={leave.start_time} onChange={(e) => setLeave({ ...leave, start_time: e.target.value })} aria-label="از (اختیاری)" />
          <input type="time" className="input" dir="ltr" value={leave.end_time} onChange={(e) => setLeave({ ...leave, end_time: e.target.value })} aria-label="تا (اختیاری)" />
          <input className="input" placeholder="دلیل" value={leave.reason} onChange={(e) => setLeave({ ...leave, reason: e.target.value })} />
          <button className="btn-outline" disabled={!leave.date} onClick={() => run(() => post(`${base}/exceptions/`, { ...leave, start_time: leave.start_time || null, end_time: leave.end_time || null, ...(office ? { office } : {}) }))}>ثبت مرخصی</button>
        </div>
        <p className="mt-2 text-xs text-muted">ساعت را خالی بگذارید تا کل روز بسته شود. نوبت‌های رزروشده لغو نمی‌شوند؛ آن‌ها را از بخش نوبت‌ها مدیریت کنید.</p>
      </div>
    </div>
  );
}
