"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Empty from "@/components/ui/Empty";
import Stars from "@/components/ui/Stars";
import { post } from "@/lib/api";
import { faDate } from "@/lib/format";

type R = { id: number; doctor_name: string | null; center_name: string | null; author: string; rating: number; text: string; status: string; created_at: string };

export default function OpsReviews() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const list = useList<R>("ops-reviews", "/ops/reviews/", { status, page });
  const act = async (id: number, action: string) => {
    await post(`/ops/reviews/${id}/${action}/`);
    qc.invalidateQueries({ queryKey: ["ops-reviews"] });
  };
  return (
    <>
      <PageTitle>مدیریت نظرات</PageTitle>
      <select className="input mb-4 w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="pending">در انتظار بررسی</option>
        <option value="approved">منتشر شده</option>
        <option value="rejected">رد شده</option>
      </select>
      {list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((r) => (
            <div key={r.id} className="card space-y-2 p-4">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <b>{r.doctor_name || r.center_name}</b>
                <span className="text-muted">از {r.author}</span>
                <Stars value={r.rating} />
                <span className="ms-auto text-xs text-muted">{faDate(r.created_at)}</span>
              </div>
              <p className="text-sm text-slate-700">{r.text || "(بدون متن)"}</p>
              <div className="flex gap-2">
                {r.status !== "approved" && <button className="btn-primary py-1.5" onClick={() => act(r.id, "approve")}>انتشار</button>}
                {r.status !== "rejected" && <button className="btn-ghost py-1.5 text-rose-600" onClick={() => act(r.id, "reject")}>رد</button>}
              </div>
            </div>
          ))}
          <Pager page={page} count={list.data.count} onPage={setPage} />
        </div>
      ) : <Empty title="موردی وجود ندارد" />}
    </>
  );
}
