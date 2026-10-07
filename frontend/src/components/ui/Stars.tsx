import { Star } from "lucide-react";
import { num } from "@/lib/format";

export default function Stars({ value, count, size = "sm" }: { value: number | string; count?: number; size?: "sm" | "md" }) {
  const v = Number(value);
  const icon = size === "md" ? "size-5" : "size-4";
  if (!v) return <span className="text-xs text-muted">بدون امتیاز</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <Star className={`${icon} fill-amber-400 text-amber-400`} />
      <b className="text-slate-800">{num(v.toFixed(1))}</b>
      {count !== undefined && <span className="text-muted">({num(count)} نظر)</span>}
    </span>
  );
}
