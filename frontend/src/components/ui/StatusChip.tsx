import { STATUS_TONE } from "@/lib/format";

export default function StatusChip({ status, label }: { status: string; label: string }) {
  return <span className={`chip ${STATUS_TONE[status] || "bg-slate-100 text-slate-600 ring-slate-200"}`}>{label}</span>;
}
