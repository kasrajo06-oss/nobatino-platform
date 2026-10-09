"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { NotifRow } from "@/components/notifications/NotificationBell";
import Empty from "@/components/ui/Empty";
import Spinner from "@/components/ui/Spinner";
import { get } from "@/lib/api";
import { useMarkRead, type Notif } from "@/lib/notifications";
import type { Paginated } from "@/lib/types";

export default function NotificationsPage() {
  const router = useRouter();
  const markRead = useMarkRead();
  const q = useInfiniteQuery({
    queryKey: ["notif-list"],
    queryFn: ({ pageParam }) => get<Paginated<Notif>>(`/me/notifications/?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.next ? all.length + 1 : undefined),
  });
  const items = q.data?.pages.flatMap((p) => p.results) ?? [];

  return (
    <div className="container-page max-w-2xl py-8">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold">اعلان‌ها</h1>
        <button className="btn-ghost text-brand-700" onClick={() => markRead({ all: true })}><CheckCheck className="size-4" /> خواندن همه</button>
      </div>
      {q.isLoading ? (
        <div className="grid h-40 place-items-center text-brand-600"><Spinner /></div>
      ) : items.length ? (
        <div className="card divide-y divide-line p-2">
          {items.map((n) => (
            <NotifRow key={n.id} n={n} onClick={() => { if (!n.is_read) markRead({ ids: [n.id] }); if (n.link) router.push(n.link); }} />
          ))}
        </div>
      ) : (
        <Empty title="اعلانی ندارید" />
      )}
      {q.hasNextPage && <button className="btn-outline mt-4 w-full" onClick={() => q.fetchNextPage()}>بیشتر</button>}
    </div>
  );
}
