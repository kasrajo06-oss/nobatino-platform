"use client";

import { useQuery } from "@tanstack/react-query";
import { get } from "@/lib/api";
import type { Paginated } from "@/lib/types";

export function useList<T>(key: string, path: string, params: Record<string, string | number | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  return useQuery({ queryKey: [key, path, sp.toString()], queryFn: () => get<Paginated<T>>(`${path}?${sp}`) });
}

export function Pager({ page, count, onPage, size = 20 }: { page: number; count: number; onPage: (p: number) => void; size?: number }) {
  const pages = Math.ceil(count / size);
  if (pages <= 1) return null;
  return (
    <div className="mt-4 flex items-center justify-center gap-2 text-sm">
      <button className="btn-ghost py-1.5" disabled={page <= 1} onClick={() => onPage(page - 1)}>قبلی</button>
      <span>{new Intl.NumberFormat("fa-IR").format(page)} از {new Intl.NumberFormat("fa-IR").format(pages)}</span>
      <button className="btn-ghost py-1.5" disabled={page >= pages} onClick={() => onPage(page + 1)}>بعدی</button>
    </div>
  );
}
