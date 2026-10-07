"use client";

import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import { faDateTime, faDigits } from "@/lib/format";

type L = { id: number; mobile: string; kind: string; text: string; status: string; error: string; created_at: string };

export default function OpsSms() {
  const [mobile, setMobile] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<L>("ops-sms", "/ops/sms-logs/", { mobile, page });
  return (
    <>
      <PageTitle>لاگ پیامک‌ها</PageTitle>
      <input className="input mb-4" dir="ltr" placeholder="09..." value={mobile} onChange={(e) => { setMobile(e.target.value); setPage(1); }} />
      <div className="card divide-y divide-line">
        {list.data?.results.map((l) => (
          <div key={l.id} className="space-y-1 p-4 text-sm">
            <div className="flex flex-wrap gap-2 text-xs text-muted">
              <b className="ltr text-slate-800">{faDigits(l.mobile)}</b>
              <span>{l.kind}</span>
              <span className={l.status === "sent" ? "text-emerald-600" : "text-rose-600"}>{l.status === "sent" ? "ارسال شد" : "ناموفق"}</span>
              <span className="ms-auto">{faDateTime(l.created_at)}</span>
            </div>
            <p className="whitespace-pre-line text-slate-700">{l.kind === "otp" ? "کد ورود (مخفی)" : l.text}</p>
            {l.error && <p className="text-xs text-rose-600">{l.error}</p>}
          </div>
        ))}
      </div>
      {list.data && <Pager page={page} count={list.data.count} onPage={setPage} />}
    </>
  );
}
