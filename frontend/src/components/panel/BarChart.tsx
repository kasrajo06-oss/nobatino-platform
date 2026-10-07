import { faDigits } from "@/lib/format";

/** Tiny dependency-free bar chart for panel dashboards. */
export default function BarChart({ data, height = 140 }: { data: { label: string; value: number }[]; height?: number }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex items-end gap-1" style={{ height }} role="img" aria-label="نمودار">
      {data.map((d, i) => (
        <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
          <div className="w-full rounded-t-md bg-brand-400 transition group-hover:bg-brand-600" style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value ? 3 : 0 }} />
          <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] whitespace-nowrap text-white group-hover:block">
            {d.label}: {faDigits(d.value)}
          </span>
        </div>
      ))}
    </div>
  );
}
