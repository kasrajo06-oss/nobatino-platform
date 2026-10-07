"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import Spinner from "@/components/ui/Spinner";
import { ApiError, api, get, post } from "@/lib/api";
import { faDate } from "@/lib/format";
import type { Appointment, Paginated } from "@/lib/types";
import AppointmentRow from "./AppointmentRow";

const tehranToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran" }).format(new Date());

/** Provider-side daily list with attendance / cancel actions. `base` = "/doctor-panel/appointments" | "/center-panel/receptions". */
export default function DayAppointments({ base, lab = false }: { base: string; lab?: boolean }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(tehranToday());
  const [q, setQ] = useState("");
  const list = useQuery({
    queryKey: ["provider-appts", base, date, q],
    queryFn: () => get<Paginated<Appointment>>(`${base}/?page_size=100&${q ? `q=${encodeURIComponent(q)}` : `date=${date}`}`),
  });
  const [error, setError] = useState("");

  const act = async (a: Appointment, action: string, body?: unknown) => {
    setError("");
    try {
      await post(`${base}/${a.tracking_code}/${action}/`, body);
      qc.invalidateQueries({ queryKey: ["provider-appts", base] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };

  const upload = async (a: Appointment, file: File) => {
    const fd = new FormData();
    fd.set("result_file", file);
    try {
      await api(`${base}/${a.tracking_code}/upload_result/`, { method: "POST", body: fd });
      qc.invalidateQueries({ queryKey: ["provider-appts", base] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };

  const shift = (days: number) => {
    const d = new Date(`${date}T12:00:00`);
    d.setDate(d.getDate() + days);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-center gap-2 p-3">
        <button className="btn-ghost py-2" onClick={() => shift(-1)}>روز قبل</button>
        <input type="date" dir="ltr" className="input w-auto" value={date} onChange={(e) => setDate(e.target.value)} />
        <button className="btn-ghost py-2" onClick={() => shift(1)}>روز بعد</button>
        <span className="text-sm font-semibold">{faDate(`${date}T12:00:00`)}</span>
        <input className="input ms-auto sm:w-64" placeholder="جستجو: نام، کد ملی یا کد پیگیری" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <Alert tone="error">{error}</Alert>}
      {list.isLoading ? (
        <div className="grid h-32 place-items-center text-brand-600"><Spinner /></div>
      ) : list.data?.results.length ? (
        list.data.results.map((a) => (
          <AppointmentRow
            key={a.id}
            a={a}
            showPatient
            actions={
              a.status === "confirmed" ? (
                <>
                  <button className="btn-primary py-2" onClick={() => act(a, "attended")}>{lab ? "پذیرش شد" : "مراجعه کرد"}</button>
                  <button className="btn-ghost py-2" onClick={() => act(a, "no_show")}>مراجعه نکرد</button>
                  <button className="btn-ghost py-2 text-rose-600" onClick={() => { const reason = prompt("دلیل لغو (به بیمار پیامک می‌شود):"); if (reason !== null) act(a, "cancel", { reason }); }}>لغو و استرداد</button>
                </>
              ) : lab && a.status === "attended" && a.lab_reception && !a.lab_reception.result_file ? (
                <label className="btn-outline cursor-pointer py-2">
                  بارگذاری جواب آزمایش
                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => e.target.files?.[0] && upload(a, e.target.files[0])} />
                </label>
              ) : undefined
            }
          />
        ))
      ) : (
        <Empty title="نوبتی برای این روز ثبت نشده است" />
      )}
    </div>
  );
}
