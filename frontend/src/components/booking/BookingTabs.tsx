"use client";

import { MapPin, MessageSquareText, Phone, Video } from "lucide-react";
import { useState } from "react";
import type { ConsultService } from "@/lib/consult";
import { toman } from "@/lib/format";
import type { Office } from "@/lib/types";
import ConsultBooking from "./ConsultBooking";
import DoctorBooking from "./DoctorBooking";

const ICONS = { in_person: MapPin, phone: Phone, text: MessageSquareText, video: Video };
const LABELS = { in_person: "نوبت مطب", phone: "تلفنی", text: "متنی", video: "ویدیویی" };

export default function BookingTabs({
  shortId,
  offices,
  services,
  availableNow,
}: {
  shortId: string;
  offices: Office[];
  services: ConsultService[];
  availableNow: boolean;
}) {
  const hasOffice = offices.some((o) => o.booking_enabled);
  const tabs = [...(hasOffice ? (["in_person"] as const) : []), ...services.map((s) => s.kind)];
  const [tab, setTab] = useState<string>(tabs[0] ?? "in_person");
  if (!tabs.length) return <DoctorBooking shortId={shortId} offices={offices} />;
  const service = services.find((s) => s.kind === tab);

  return (
    <div className="space-y-5">
      {tabs.length > 1 && (
        <div className="grid gap-1.5 rounded-2xl bg-slate-100 p-1.5" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
          {tabs.map((t) => {
            const Icon = ICONS[t as keyof typeof ICONS];
            const s = services.find((x) => x.kind === t);
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition ${tab === t ? "bg-white text-brand-700 shadow" : "text-slate-500 hover:text-slate-800"}`}
              >
                <Icon className="size-5" />
                {LABELS[t as keyof typeof LABELS]}
                {s && <span className="text-[10px] font-normal text-muted">{toman(s.price).replace(" تومان", "")}</span>}
              </button>
            );
          })}
        </div>
      )}
      {tab === "in_person" ? (
        <DoctorBooking shortId={shortId} offices={offices} />
      ) : service ? (
        <ConsultBooking key={service.kind} shortId={shortId} service={service} availableNow={availableNow} />
      ) : null}
    </div>
  );
}
