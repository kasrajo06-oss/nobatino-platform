"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError, post } from "@/lib/api";
import { faDigits, faShort, relativeSlot, toman } from "@/lib/format";
import type { Appointment, Office, SlotItem } from "@/lib/types";
import { useMe } from "@/lib/use-me";
import PatientPicker from "./PatientPicker";
import SlotPicker from "./SlotPicker";

export default function DoctorBooking({ shortId, offices }: { shortId: string; offices: Office[] }) {
  const router = useRouter();
  // offices with the nearest free slot first, so the default choice actually has free times
  const bookable = offices
    .filter((o) => o.booking_enabled)
    .sort((a, b) => (a.first_free_slot_at ?? "9999").localeCompare(b.first_free_slot_at ?? "9999"));
  const [officeId, setOfficeId] = useState(bookable[0]?.id ?? null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<SlotItem | null>(null);
  const [member, setMember] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { data: me, isLoading } = useMe();
  const office = bookable.find((o) => o.id === officeId);

  if (!bookable.length) return <Alert>این پزشک در حال حاضر نوبت‌دهی آنلاین ندارد. با شماره مطب تماس بگیرید.</Alert>;

  const book = async () => {
    if (!slot) return;
    setBusy(true);
    setError("");
    try {
      const appt = await post<Appointment>("/me/appointments/", { slot: slot.id, family_member: member, note });
      router.push(`/booking/${appt.tracking_code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در ثبت نوبت");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {bookable.length > 1 && (
        <div>
          <span className="label">انتخاب مطب</span>
          <div className="grid gap-2">
            {bookable.map((o) => (
              <button
                key={o.id}
                onClick={() => { setOfficeId(o.id); setDay(null); setSlot(null); }}
                className={`rounded-xl border p-3 text-right text-sm ${officeId === o.id ? "border-brand-600 bg-brand-50" : "border-line bg-white"}`}
              >
                <b>{o.title} - {o.city.name}</b>
                <span className="mt-1 line-clamp-1 block text-xs text-muted">{o.address}</span>
                <span className={`mt-1 block text-xs ${o.first_free_slot_at ? "text-emerald-700" : "text-muted"}`}>
                  {o.first_free_slot_at ? `اولین نوبت آزاد: ${relativeSlot(o.first_free_slot_at)}` : "فعلاً نوبت آزاد ندارد"}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <span className="label">انتخاب روز و ساعت</span>
        <SlotPicker
          base={`/doctors/${shortId}`}
          extra={`office=${officeId}`}
          day={day}
          onDay={(d) => { setDay(d); setSlot(null); }}
          slot={slot?.id ?? null}
          onSlot={setSlot}
        />
      </div>

      {slot && (
        <div className="space-y-4 border-t border-line pt-4">
          <p className="text-sm">
            نوبت انتخابی: <b>{faShort(slot.start)} ساعت {faDigits(slot.time)}</b>
          </p>
          {isLoading ? (
            <Spinner />
          ) : !me ? (
            <button className="btn-primary w-full" onClick={() => router.push(`/login?next=${encodeURIComponent(location.pathname + "#booking")}`)}>
              برای ادامه وارد شوید
            </button>
          ) : (
            <>
              <div>
                <span className="label">نوبت برای</span>
                <PatientPicker me={me} value={member} onChange={setMember} />
              </div>
              <textarea className="input" rows={2} maxLength={400} placeholder="توضیحات برای پزشک (اختیاری)" value={note} onChange={(e) => setNote(e.target.value)} />
              {office && (
                <div className="rounded-xl bg-slate-50 p-3 text-xs leading-6 text-slate-600">
                  {office.booking_fee > 0 ? <p>هزینه رزرو آنلاین: <b>{toman(office.booking_fee)}</b></p> : <p>رزرو این نوبت رایگان است.</p>}
                  {office.visit_fee > 0 && <p>هزینه ویزیت (در مطب): {toman(office.visit_fee)}</p>}
                  {office.notes && <p>{office.notes}</p>}
                </div>
              )}
              {error && <Alert tone="error">{error}</Alert>}
              <button className="btn-primary w-full py-3" disabled={busy || (!me.profile_completed && member === null)} onClick={book}>
                {busy ? <Spinner className="size-4" /> : "ثبت نوبت"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
