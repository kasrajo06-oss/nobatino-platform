"use client";

import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import { faDateTime } from "@/lib/format";

type A = { id: number; actor: string | null; action: string; target_type: string; target_repr: string; data: Record<string, unknown>; ip: string | null; created_at: string };

export default function OpsAudit() {
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<A>("ops-audit", "/ops/audit-logs/", { action, page });
  return (
    <>
      <PageTitle>گزارش رویدادها</PageTitle>
      <input className="input mb-4" dir="ltr" placeholder="action (e.g. login, verify_approved)" value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-muted"><tr><th className="p-3 text-right">زمان</th><th className="text-right">کاربر</th><th className="text-right">رویداد</th><th className="text-right">موضوع</th><th className="text-right">جزئیات</th><th className="text-right">IP</th></tr></thead>
          <tbody className="divide-y divide-line">
            {list.data?.results.map((a) => (
              <tr key={a.id}>
                <td className="p-3 whitespace-nowrap">{faDateTime(a.created_at)}</td>
                <td>{a.actor || "—"}</td>
                <td className="ltr text-right">{a.action}</td>
                <td>{a.target_repr}</td>
                <td className="ltr max-w-64 truncate text-right">{Object.keys(a.data).length ? JSON.stringify(a.data) : ""}</td>
                <td className="ltr text-right">{a.ip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {list.data && <Pager page={page} count={list.data.count} onPage={setPage} />}
    </>
  );
}
