"use client";

import { Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError, post } from "@/lib/api";
import { KIND_META, type ConsultService, type Consultation } from "@/lib/consult";
import { faDigits, faShort, num, toman } from "@/lib/format";
import type { SlotItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import PatientPicker from "./PatientPicker";
import SlotPicker from "./SlotPicker";

export default function ConsultBooking({ shortId, service, availableNow }: { shortId: string; service: ConsultService; availableNow: boolean }) {
  const router = useRouter();
  const { data: me } = useMe();
  const canInstant = service.instant_enabled && availableNow;
  const [instant, setInstant] = useState(canInstant && service.kind !== "video");
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotItem | null>(null);
  const [complaint, setComplaint] = useState("");
  const [member, setMember] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const meta = KIND_META[service.kind];
  const needsSlot = service.kind !== "text" && !instant;

  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const c = await post<Consultation>("/me/consultations/", {
        doctor: shortId, kind: service.kind, complaint, slot: needsSlot ? slot?.id : null, instant, family_member: member,
      });
      router.push(`/booking/${c.appointment.tracking_code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ثبت مشاوره");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-4 ring-1 ring-inset ${meta.tone}`}>
        <div className="flex items-center justify-between">
          <b>{meta.label}</b>
          <b>{toman(service.price)}</b>
        </div>
        <p className="mt-1 text-xs leading-6 opacity-80">
          {meta.desc}
          {service.kind !== "text" && ` · ${faDigits(service.duration_minutes)} دقیقه`}
        </p>
      </div>

      {canInstant && service.kind !== "text" && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setInstant(true)} className={`flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm ring-1 ${instant ? "bg-amber-50 text-amber-800 ring-amber-300" : "ring-line"}`}>
            <Zap className="size-4" /> همین حالا
          </button>
          <button onClick={() => setInstant(false)} className={`rounded-xl py-2.5 text-sm ring-1 ${!instant ? "bg-brand-50 text-brand-800 ring-brand-300" : "ring-line"}`}>رزرو زمان</button>
        </div>
      )}
      {canInstant && service.kind === "text" && (
        <label className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
          <input type="checkbox" className="accent-amber-500" checked={instant} onChange={(e) => setInstant(e.target.checked)} />
          <Zap className="size-4" /> پزشک آنلاین است؛ درخواست فوری (پاسخ در چند دقیقه)
        </label>
      )}

      {needsSlot && (
        <div>
          <span className="label">انتخاب زمان تماس</span>
          <SlotPicker base={`/doctors/${shortId}`} availabilityPath="online-availability" slotsPath="online-slots" day={day} onDay={(d) => { setDay(d); setSlot(null); }} slot={slot?.id ?? null} onSlot={setSlot} />
        </div>
      )}

      {(!needsSlot || slot) && (
        <div className="space-y-4 border-t border-line pt-4">
          {slot && needsSlot && <p className="text-sm">زمان تماس: <b>{faShort(slot.start)} ساعت {faDigits(slot.time)}</b></p>}
          <div>
            <label className="label" htmlFor="complaint">شرح حال و سؤال شما</label>
            <textarea id="complaint" className="input" rows={4} maxLength={4000} placeholder="علائم، مدت بیماری، داروهای مصرفی و سؤال خود را بنویسید..." value={complaint} onChange={(e) => setComplaint(e.target.value)} />
            <p className="mt-1 text-xs text-muted">{num(complaint.length)} / ۴٬۰۰۰ — عکس و مدارک را پس از ثبت در صفحه مشاوره ارسال کنید.</p>
          </div>
          {!me ? (
            <button className="btn-primary w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(location.pathname)}`)}>برای ادامه وارد شوید</button>
          ) : (
            <>
              <div>
                <span className="label">مشاوره برای</span>
                <PatientPicker me={me} value={member} onChange={setMember} />
              </div>
              {error && <Alert tone="error">{error}</Alert>}
              <button className="btn-primary w-full py-3" disabled={busy || complaint.trim().length < 10 || (!me.profile_completed && member === null)} onClick={submit}>
                {busy ? <Spinner className="size-4" /> : `ادامه و پرداخت ${toman(service.price)}`}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
