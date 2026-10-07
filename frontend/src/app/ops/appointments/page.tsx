"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import AppointmentRow from "@/components/panel/AppointmentRow";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import { ApiError, post } from "@/lib/api";
import { toman } from "@/lib/format";
import type { Appointment } from "@/lib/types";

export default function OpsAppointments() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<Appointment>("ops-appts", "/ops/appointments/", { q, status, page });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const cancel = async (a: Appointment) => {
    const reason = prompt("دلیل لغو توسط پشتیبانی:");
    if (!reason) return;
    try {
      const r = await post<{ refunded: number }>(`/ops/appointments/${a.tracking_code}/cancel/`, { reason });
      setMsg({ tone: "success", text: `نوبت لغو شد. مبلغ مسترد: ${toman(r.refunded)}` });
      qc.invalidateQueries({ queryKey: ["ops-appts"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };

  return (
    <>
      <PageTitle>پشتیبانی نوبت‌ها</PageTitle>
      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        <input className="input flex-1" placeholder="کد پیگیری، موبایل، کد ملی یا نام بیمار" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">همه وضعیت‌ها</option>
          <option value="pending_payment">در انتظار پرداخت</option>
          <option value="confirmed">قطعی</option>
          <option value="attended">مراجعه شد</option>
          <option value="cancelled">لغو شده</option>
        </select>
      </div>
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((a) => (
            <AppointmentRow key={a.id} a={a} actions={["confirmed", "pending_payment"].includes(a.status) ? <button className="btn-ghost py-2 text-rose-600" onClick={() => cancel(a)}>لغو و استرداد کامل</button> : undefined} />
          ))}
          <Pager page={page} count={list.data.count} onPage={setPage} />
        </div>
      ) : <Empty title="نوبتی یافت نشد" />}
    </>
  );
}
