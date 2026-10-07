import { Inbox } from "lucide-react";

export default function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <Inbox className="size-10 text-slate-300" />
      <p className="font-semibold text-slate-700">{title}</p>
      {children && <div className="text-sm text-muted">{children}</div>}
    </div>
  );
}
