"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, post } from "@/lib/api";
import { faDate, toman } from "@/lib/format";

type S = { id: number; payee: string; amount: number; iban: string; status: string; status_display: string; bank_ref: string; created_at: string };

export default function OpsSettlements() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("requested");
  const [page, setPage] = useState(1);
  const list = useList<S>("ops-settlements", "/ops/settlements/", { status, page });
  const [error, setError] = useState("");
  const act = async (s: S, action: "pay" | "reject") => {
    const value = prompt(action === "pay" ? "کد پیگیری واریز بانکی:" : "دلیل رد:");
    if (!value) return;
    try {
      await post(`/ops/settlements/${s.id}/${action}/`, action === "pay" ? { bank_ref: value } : { note: value });
      qc.invalidateQueries({ queryKey: ["ops-settlements"] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };
  return (
    <>
      <PageTitle>تسویه‌حساب پزشکان و مراکز</PageTitle>
      <select className="input mb-4 w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="requested">درخواست شده</option>
        <option value="paid">واریز شده</option>
        <option value="rejected">رد شده</option>
      </select>
      {error && <div className="mb-3"><Alert tone="error">{error}</Alert></div>}
      {list.data?.results.length ? (
        <div className="card divide-y divide-line">
          {list.data.results.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
              <b>{s.payee}</b>
              <span>{toman(s.amount)}</span>
              <span className="ltr text-xs text-muted">{s.iban}</span>
              <span className="text-xs text-muted">{faDate(s.created_at)}</span>
              <StatusChip status={s.status} label={s.status_display} />
              {s.status === "requested" && (
                <span className="ms-auto flex gap-2">
                  <button className="btn-primary py-1.5" onClick={() => act(s, "pay")}>ثبت واریز</button>
                  <button className="btn-ghost py-1.5 text-rose-600" onClick={() => act(s, "reject")}>رد</button>
                </span>
              )}
            </div>
          ))}
        </div>
      ) : <Empty title="موردی وجود ندارد" />}
      {list.data && <Pager page={page} count={list.data.count} onPage={setPage} />}
    </>
  );
}
