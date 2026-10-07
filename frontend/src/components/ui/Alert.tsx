import { AlertCircle, CheckCircle2, Info } from "lucide-react";

const TONES = {
  error: ["bg-rose-50 text-rose-800 ring-rose-200", AlertCircle],
  success: ["bg-emerald-50 text-emerald-800 ring-emerald-200", CheckCircle2],
  info: ["bg-brand-50 text-brand-800 ring-brand-200", Info],
} as const;

export default function Alert({ tone = "info", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  const [cls, Icon] = TONES[tone];
  return (
    <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ring-1 ring-inset ${cls}`} role={tone === "error" ? "alert" : "status"}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="leading-6">{children}</div>
    </div>
  );
}
