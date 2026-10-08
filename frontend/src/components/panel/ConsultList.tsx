"use client";

import { useQuery } from "@tanstack/react-query";
import { MessageSquareText, Phone, Video, Zap } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Avatar from "@/components/ui/Avatar";
import Empty from "@/components/ui/Empty";
import Spinner from "@/components/ui/Spinner";
import { get } from "@/lib/api";
import { STATE_TONE, type Consultation } from "@/lib/consult";
import { faDateTime, faDigits } from "@/lib/format";
import type { Paginated } from "@/lib/types";
import { Tabs } from "./PanelShell";

const KIND_ICON = { phone: Phone, text: MessageSquareText, video: Video };

/** Consultation inbox for patients (`/me/consultations`) and doctors (`/doctor-panel/consultations`). */
export default function ConsultList({ endpoint, asDoctor = false }: { endpoint: string; asDoctor?: boolean }) {
  const [state, setState] = useState<"waiting" | "active" | "closed">(asDoctor ? "waiting" : "active");
  const list = useQuery({
    queryKey: ["consult-list", endpoint, state],
    queryFn: () => get<Paginated<Consultation>>(`${endpoint}?state=${state}`),
    refetchInterval: 20000,
  });
  return (
    <>
      <Tabs value={state} onChange={setState} items={[["waiting", "در انتظار پزشک"], ["active", "در حال مشاوره"], ["closed", "پایان یافته"]]} />
      {list.isLoading ? (
        <div className="grid h-32 place-items-center text-brand-600"><Spinner /></div>
      ) : list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((c) => {
            const Icon = KIND_ICON[c.kind];
            const appt = c.appointment;
            return (
              <Link key={c.id} href={`/consult/${appt.tracking_code}`} className="card flex items-center gap-4 p-4 transition hover:border-brand-300 hover:shadow-md">
                {asDoctor ? <Avatar name={appt.patient_name} size={52} /> : <Avatar src={c.doctor.photo} name={c.doctor.full_name} gender={c.doctor.gender} size={52} />}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <b className="truncate">{asDoctor ? appt.patient_name : c.doctor.full_name}</b>
                    <span className="chip bg-slate-50 text-slate-600 ring-line"><Icon className="size-3.5" /> {c.kind_display}</span>
                    {c.is_instant && <span className="chip bg-amber-50 text-amber-700 ring-amber-200"><Zap className="size-3" /> فوری</span>}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted">{c.unread_hint ? `${c.unread_hint.from_doctor ? "پزشک" : "بیمار"}: ${c.unread_hint.text}` : c.complaint}</p>
                  <p className="mt-1 text-xs text-muted">{c.kind === "text" || c.is_instant ? faDateTime(c.created_at) : `زمان تماس: ${faDateTime(appt.start)}`} · کد {faDigits(appt.tracking_code)}</p>
                </div>
                <span className={`chip ${STATE_TONE[c.state]}`}>{appt.status === "cancelled" ? "لغو / مسترد" : appt.status === "pending_payment" ? "در انتظار پرداخت" : c.state_display}</span>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty title="موردی وجود ندارد">
          {!asDoctor && <Link href="/doctors/telehealth" className="text-brand-700">شروع مشاوره آنلاین</Link>}
        </Empty>
      )}
    </>
  );
}
