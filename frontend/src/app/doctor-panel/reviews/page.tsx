"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Empty from "@/components/ui/Empty";
import Stars from "@/components/ui/Stars";
import { get, post } from "@/lib/api";
import { faDate } from "@/lib/format";
import type { Paginated } from "@/lib/types";

type R = { id: number; author: string; rating: number; recommends: boolean; text: string; reply: string; created_at: string; tracking_code: string };

export default function DoctorReviews() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["dp-reviews"], queryFn: () => get<Paginated<R>>("/doctor-panel/reviews/") });
  const [drafts, setDrafts] = useState<Record<number, string>>({});
  return (
    <>
      <PageTitle>نظرات بیماران</PageTitle>
      {list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((r) => (
            <div key={r.id} className="card space-y-2 p-4">
              <div className="flex items-center gap-2 text-sm"><b>{r.author}</b><Stars value={r.rating} /><span className="ms-auto text-xs text-muted">{faDate(r.created_at)}</span></div>
              {r.text && <p className="text-sm text-slate-700">{r.text}</p>}
              <div className="flex gap-2">
                <input className="input" placeholder="پاسخ شما..." value={drafts[r.id] ?? r.reply} onChange={(e) => setDrafts({ ...drafts, [r.id]: e.target.value })} />
                <button className="btn-outline shrink-0" onClick={async () => { await post(`/doctor-panel/reviews/${r.id}/reply/`, { reply: drafts[r.id] ?? r.reply }); qc.invalidateQueries({ queryKey: ["dp-reviews"] }); }}>ثبت پاسخ</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="هنوز نظری منتشر نشده است" />
      )}
    </>
  );
}
