"use client";

import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import StatusChip from "@/components/ui/StatusChip";
import { faDateTime, faDigits, toman } from "@/lib/format";

type P = { id: number; purpose_display: string; amount: number; wallet_amount: number; status: string; status_display: string; ref_id: string; tracking_code: string | null; created_at: string; error: string };

export default function OpsPayments() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<P>("ops-payments", "/ops/payments/", { q, status, page });
  return (
    <>
      <PageTitle>پرداخت‌ها</PageTitle>
      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        <input className="input flex-1" placeholder="کد رهگیری بانک، authority یا موبایل" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">همه</option>
          <option value="paid">موفق</option>
          <option value="failed">ناموفق</option>
          <option value="redirected">ارسال به درگاه</option>
        </select>
      </div>
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-3 text-right">#</th><th className="text-right">نوع</th><th className="text-right">مبلغ</th><th className="text-right">نوبت</th><th className="text-right">رهگیری</th><th className="text-right">زمان</th><th className="text-right">وضعیت</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.data?.results.map((p) => (
              <tr key={p.id} title={p.error}>
                <td className="p-3">{faDigits(p.id)}</td>
                <td>{p.purpose_display}</td>
                <td>{toman(p.amount)}{p.wallet_amount > 0 && <span className="text-xs text-muted"> + {toman(p.wallet_amount)} کیف پول</span>}</td>
                <td>{p.tracking_code ? faDigits(p.tracking_code) : "—"}</td>
                <td className="ltr text-right text-xs">{p.ref_id || "—"}</td>
                <td className="text-xs">{faDateTime(p.created_at)}</td>
                <td><StatusChip status={p.status === "paid" ? "paid" : p.status === "failed" ? "cancelled" : "pending"} label={p.status_display} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && <Pager page={page} count={list.data.count} onPage={setPage} />}
    </>
  );
}
