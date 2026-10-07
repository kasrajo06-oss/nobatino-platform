import Link from "next/link";
import { num } from "@/lib/format";

export default function Pagination({ page, count, pageSize, makeHref }: { page: number; count: number; pageSize: number; makeHref: (p: number) => string }) {
  const pages = Math.ceil(count / pageSize);
  if (pages <= 1) return null;
  const around = Array.from(new Set([1, page - 1, page, page + 1, pages])).filter((p) => p >= 1 && p <= pages).sort((a, b) => a - b);
  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="pagination">
      {around.map((p, i) => (
        <span key={p} className="flex items-center gap-1">
          {i > 0 && p - around[i - 1] > 1 && <span className="px-1 text-muted">…</span>}
          <Link
            href={makeHref(p)}
            className={`grid size-10 place-items-center rounded-xl text-sm font-semibold ${
              p === page ? "bg-brand-600 text-white" : "border border-line bg-white text-slate-700 hover:border-brand-400"
            }`}
            aria-current={p === page ? "page" : undefined}
          >
            {num(p)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
