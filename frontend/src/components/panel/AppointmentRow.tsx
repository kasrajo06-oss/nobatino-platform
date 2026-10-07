import { CalendarClock, FileText, MapPin } from "lucide-react";
import Link from "next/link";
import StatusChip from "@/components/ui/StatusChip";
import { faDateTime, faDigits, toman } from "@/lib/format";
import type { Appointment } from "@/lib/types";

export default function AppointmentRow({ a, actions, showPatient = false }: { a: Appointment; actions?: React.ReactNode; showPatient?: boolean }) {
  return (
    <div className="card space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <b className="text-slate-900">{showPatient ? a.patient_name : a.provider_name}</b>
        <span className="text-xs text-brand-700">{showPatient ? `${a.kind_display} · ${faDigits(a.patient_mobile)}` : a.specialty}</span>
        <span className="ms-auto"><StatusChip status={a.status} label={a.status_display} /></span>
      </div>
      <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <span className="flex items-center gap-1.5"><CalendarClock className="size-4 text-brand-600" /> {faDateTime(a.start)}</span>
        <span className="flex items-center gap-1.5">کد پیگیری: <b className="tracking-wider">{faDigits(a.tracking_code)}</b></span>
        {!showPatient && <span className="flex items-start gap-1.5 sm:col-span-2"><MapPin className="size-4 shrink-0 text-brand-600" /> {a.address}</span>}
        {!showPatient && <span>بیمار: {a.patient_name}</span>}
        {showPatient && <span>کد ملی: {faDigits(a.patient_national_code)}</span>}
        {a.paid_amount > 0 && <span>پرداختی: {toman(a.paid_amount)}{a.refunded_amount > 0 && ` (مسترد: ${toman(a.refunded_amount)})`}</span>}
        {a.patient_note && <span className="sm:col-span-2">توضیحات: {a.patient_note}</span>}
        {a.cancel_reason && <span className="text-rose-600 sm:col-span-2">دلیل لغو: {a.cancel_reason}</span>}
      </div>
      {a.lab_reception && (
        <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
          <p>آزمایش‌ها: {a.lab_reception.tests.map((t) => t.name).join("، ") || "طبق نسخه"}</p>
          {a.lab_reception.home_sampling && <p>نمونه‌گیری در منزل: {a.lab_reception.home_address}</p>}
          <p>وضعیت: {a.lab_reception.status_display}</p>
          <div className="mt-1 flex gap-3">
            {a.lab_reception.prescription && <a className="inline-flex items-center gap-1 text-brand-700" href={a.lab_reception.prescription} target="_blank" rel="noreferrer"><FileText className="size-3.5" /> نسخه</a>}
            {a.lab_reception.result_file && <a className="inline-flex items-center gap-1 font-semibold text-emerald-700" href={a.lab_reception.result_file} target="_blank" rel="noreferrer"><FileText className="size-3.5" /> جواب آزمایش</a>}
          </div>
        </div>
      )}
      {(actions || a.status === "pending_payment") && (
        <div className="flex flex-wrap gap-2 border-t border-dashed border-line pt-3">
          {a.status === "pending_payment" && !showPatient && <Link href={`/booking/${a.tracking_code}`} className="btn-primary py-2">تکمیل پرداخت</Link>}
          {actions}
        </div>
      )}
    </div>
  );
}
