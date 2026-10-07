"use client";

import { useQuery } from "@tanstack/react-query";
import { PageTitle } from "@/components/panel/PanelShell";
import Empty from "@/components/ui/Empty";
import Stars from "@/components/ui/Stars";
import StatusChip from "@/components/ui/StatusChip";
import { get } from "@/lib/api";
import { faDate } from "@/lib/format";
import type { Paginated } from "@/lib/types";

type MyReview = { id: number; doctor_name: string | null; center_name: string | null; rating: number; text: string; status: string; reply: string; created_at: string };
const STATUS: Record<string, string> = { pending: "در انتظار بررسی", approved: "منتشر شده", rejected: "رد شده" };

export default function MyReviews() {
  const list = useQuery({ queryKey: ["my-reviews"], queryFn: () => get<Paginated<MyReview>>("/me/reviews/") });
  return (
    <>
      <PageTitle>نظرات من</PageTitle>
      {list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((r) => (
            <div key={r.id} className="card space-y-2 p-4">
              <div className="flex items-center gap-2">
                <b>{r.doctor_name || r.center_name}</b>
                <Stars value={r.rating} />
                <span className="ms-auto"><StatusChip status={r.status} label={STATUS[r.status]} /></span>
              </div>
              {r.text && <p className="text-sm text-slate-700">{r.text}</p>}
              {r.reply && <p className="rounded-lg bg-brand-50 p-2 text-sm text-brand-900">پاسخ: {r.reply}</p>}
              <p className="text-xs text-muted">{faDate(r.created_at)}</p>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="هنوز نظری ثبت نکرده‌اید">پس از مراجعه به پزشک، از بخش نوبت‌ها نظر خود را ثبت کنید.</Empty>
      )}
    </>
  );
}
