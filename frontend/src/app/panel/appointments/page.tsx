"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import AppointmentRow from "@/components/panel/AppointmentRow";
import { PageTitle, Tabs } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { ApiError, get, post } from "@/lib/api";
import { toman } from "@/lib/format";
import type { Appointment, Paginated } from "@/lib/types";

export default function MyAppointments() {
  const qc = useQueryClient();
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");
  const list = useQuery({ queryKey: ["my-appointments", scope], queryFn: () => get<Paginated<Appointment>>(`/me/appointments/?scope=${scope}`) });
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [reviewing, setReviewing] = useState<Appointment | null>(null);
  const [message, setMessage] = useState("");

  return (
    <>
      <PageTitle action={<Link href="/doctors" className="btn-primary py-2">نوبت جدید</Link>}>نوبت‌های من</PageTitle>
      <Tabs value={scope} onChange={setScope} items={[["upcoming", "نوبت‌های پیش رو"], ["past", "سوابق"]]} />
      {message && <div className="mb-3"><Alert tone="success">{message}</Alert></div>}
      {list.isLoading ? (
        <div className="grid h-40 place-items-center text-brand-600"><Spinner /></div>
      ) : list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((a) => (
            <AppointmentRow
              key={a.id}
              a={a}
              actions={
                <>
                  {a.can_cancel && <button className="btn-ghost py-2 text-rose-600" onClick={() => setCancelling(a)}>لغو نوبت</button>}
                  {a.can_review && <button className="btn-outline py-2" onClick={() => setReviewing(a)}>ثبت نظر</button>}
                  {a.provider_url && <Link href={a.provider_url} className="btn-ghost py-2">نوبت مجدد</Link>}
                </>
              }
            />
          ))}
        </div>
      ) : (
        <Empty title={scope === "upcoming" ? "نوبت فعالی ندارید" : "سابقه‌ای وجود ندارد"}>
          <Link href="/doctors" className="text-brand-700">جستجوی پزشک</Link>
        </Empty>
      )}
      <CancelModal
        appt={cancelling}
        onClose={() => setCancelling(null)}
        onDone={(refunded) => {
          setMessage(refunded ? `نوبت لغو شد و ${toman(refunded)} به کیف پول شما برگشت.` : "نوبت لغو شد.");
          qc.invalidateQueries({ queryKey: ["my-appointments"] });
        }}
      />
      <ReviewModal appt={reviewing} onClose={() => setReviewing(null)} onDone={() => { setMessage("نظر شما ثبت شد و پس از بررسی منتشر می‌شود."); qc.invalidateQueries({ queryKey: ["my-appointments"] }); }} />
    </>
  );
}

function CancelModal({ appt, onClose, onDone }: { appt: Appointment | null; onClose: () => void; onDone: (refunded: number) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!appt) return null;
  const hoursLeft = (new Date(appt.start).getTime() - Date.now()) / 3600000;
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ refunded: number }>(`/me/appointments/${appt.tracking_code}/cancel/`, { reason });
      onDone(r.refunded);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} title="لغو نوبت">
      <div className="space-y-3">
        {appt.paid_amount > 0 && (
          <Alert tone={hoursLeft >= 24 ? "info" : "error"}>
            {hoursLeft >= 24 ? `مبلغ ${toman(appt.paid_amount)} به کیف پول شما بازگردانده می‌شود.` : "کمتر از ۲۴ ساعت به نوبت مانده است؛ طبق قوانین، وجه پرداختی مسترد نمی‌شود."}
          </Alert>
        )}
        <textarea className="input" rows={3} placeholder="دلیل لغو (اختیاری)" value={reason} onChange={(e) => setReason(e.target.value)} />
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-danger w-full" disabled={busy} onClick={submit}>تأیید لغو</button>
      </div>
    </Modal>
  );
}

function ReviewModal({ appt, onClose, onDone }: { appt: Appointment | null; onClose: () => void; onDone: () => void }) {
  const [rating, setRating] = useState(5);
  const [recommends, setRecommends] = useState(true);
  const [wait, setWait] = useState("10");
  const [text, setText] = useState("");
  const [showName, setShowName] = useState(false);
  const [error, setError] = useState("");
  if (!appt) return null;
  const submit = async () => {
    try {
      await post("/me/reviews/", { appointment: appt.id, rating, recommends, wait_minutes: Number(wait), text, show_name: showName });
      onDone();
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };
  return (
    <Modal open onClose={onClose} title={`نظر شما درباره ${appt.provider_name}`}>
      <div className="space-y-4">
        <div>
          <span className="label">امتیاز</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} className={`text-3xl ${n <= rating ? "text-amber-400" : "text-slate-200"}`} aria-label={`${n} ستاره`}>★</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setRecommends(true)} className={`rounded-xl py-2 text-sm ring-1 ${recommends ? "bg-emerald-50 text-emerald-700 ring-emerald-300" : "ring-line"}`}>پیشنهاد می‌کنم</button>
          <button onClick={() => setRecommends(false)} className={`rounded-xl py-2 text-sm ring-1 ${!recommends ? "bg-rose-50 text-rose-700 ring-rose-300" : "ring-line"}`}>پیشنهاد نمی‌کنم</button>
        </div>
        <div>
          <label className="label" htmlFor="wait">زمان انتظار در مطب</label>
          <select id="wait" className="input" value={wait} onChange={(e) => setWait(e.target.value)}>
            <option value="10">کمتر از ۱۵ دقیقه</option>
            <option value="25">۱۵ تا ۳۰ دقیقه</option>
            <option value="45">۳۰ دقیقه تا ۱ ساعت</option>
            <option value="75">بیش از ۱ ساعت</option>
          </select>
        </div>
        <textarea className="input" rows={3} placeholder="تجربه خود را بنویسید..." value={text} onChange={(e) => setText(e.target.value)} />
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-600" checked={showName} onChange={(e) => setShowName(e.target.checked)} /> نام من نمایش داده شود</label>
        {error && <Alert tone="error">{error}</Alert>}
        <button className="btn-primary w-full" onClick={submit}>ثبت نظر</button>
      </div>
    </Modal>
  );
}
