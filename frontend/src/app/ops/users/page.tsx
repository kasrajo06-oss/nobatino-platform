"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Alert from "@/components/ui/Alert";
import { ApiError, patch, post } from "@/lib/api";
import { faDate, faDigits, ROLE_LABELS } from "@/lib/format";

type U = { id: number; mobile: string; full_name: string; national_code: string; role: string; is_active: boolean; date_joined: string };

export default function OpsUsers() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<U>("ops-users", "/ops/users/", { q, role, page });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      setMsg({ tone: "success", text: ok });
      qc.invalidateQueries({ queryKey: ["ops-users"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };

  return (
    <>
      <PageTitle>کاربران</PageTitle>
      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        <input className="input flex-1" placeholder="موبایل، نام یا کد ملی" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select className="input w-auto" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
          <option value="">همه نقش‌ها</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-muted"><tr><th className="p-3 text-right">کاربر</th><th className="text-right">موبایل</th><th className="text-right">نقش</th><th className="text-right">عضویت</th><th className="text-right">وضعیت</th><th /></tr></thead>
          <tbody className="divide-y divide-line">
            {list.data?.results.map((u) => (
              <tr key={u.id}>
                <td className="p-3">{u.full_name || "—"}</td>
                <td className="ltr text-right">{faDigits(u.mobile)}</td>
                <td>
                  <select className="rounded-lg border border-line bg-white px-2 py-1 text-xs" value={u.role} onChange={(e) => run(() => patch(`/ops/users/${u.id}/`, { role: e.target.value }), "نقش تغییر کرد.")}>
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="text-xs">{faDate(u.date_joined)}</td>
                <td>
                  <button className={`chip ${u.is_active ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-rose-50 text-rose-700 ring-rose-200"}`} onClick={() => run(() => patch(`/ops/users/${u.id}/`, { is_active: !u.is_active }), "وضعیت تغییر کرد.")}>
                    {u.is_active ? "فعال" : "مسدود"}
                  </button>
                </td>
                <td className="p-2 text-left">
                  <button className="btn-ghost py-1 text-xs" onClick={() => {
                    const amount = prompt("مبلغ شارژ کیف پول (تومان):");
                    const reason = amount ? prompt("دلیل:") : null;
                    if (amount && reason) run(() => post(`/ops/users/${u.id}/wallet_adjust/`, { amount: Number(amount), reason }), "کیف پول شارژ شد.");
                  }}>شارژ کیف پول</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && <Pager page={page} count={list.data.count} onPage={setPage} />}
    </>
  );
}
