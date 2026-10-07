"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { MessageSquareReply, ThumbsDown, ThumbsUp } from "lucide-react";
import Stars from "@/components/ui/Stars";
import { get } from "@/lib/api";
import { faDate } from "@/lib/format";
import type { Paginated, Review } from "@/lib/types";

export default function ReviewList({ shortId, initial }: { shortId: string; initial: Paginated<Review> }) {
  const q = useInfiniteQuery({
    queryKey: ["reviews", shortId],
    queryFn: ({ pageParam }) => get<Paginated<Review>>(`/doctors/${shortId}/reviews/?page=${pageParam}`),
    initialPageParam: 1,
    initialData: { pages: [initial], pageParams: [1] },
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
  });
  const reviews = q.data.pages.flatMap((p) => p.results);
  if (!reviews.length) return <p className="text-sm text-muted">هنوز نظری ثبت نشده است.</p>;
  return (
    <div className="space-y-3">
      {reviews.map((r) => (
        <div key={r.id} className="rounded-xl border border-line p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
            <b className="text-slate-800">{r.author}</b>
            <Stars value={r.rating} />
            {r.recommends ? (
              <span className="inline-flex items-center gap-1 text-emerald-700"><ThumbsUp className="size-3.5" /> پیشنهاد می‌کنم</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-700"><ThumbsDown className="size-3.5" /> پیشنهاد نمی‌کنم</span>
            )}
            {r.wait_display && <span>معطلی: {r.wait_display}</span>}
            <span className="ms-auto">{faDate(r.created_at)}</span>
          </div>
          {r.text && <p className="mt-2 text-sm leading-7 text-slate-700">{r.text}</p>}
          {r.reply && (
            <div className="mt-3 flex gap-2 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
              <MessageSquareReply className="size-4 shrink-0" />
              <p className="leading-6">{r.reply}</p>
            </div>
          )}
        </div>
      ))}
      {q.hasNextPage && (
        <button className="btn-outline w-full" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
          نظرات بیشتر
        </button>
      )}
    </div>
  );
}
