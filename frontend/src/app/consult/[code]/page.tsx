"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Clock, FileText, Paperclip, Send, Stethoscope } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import CallPanel from "@/components/consult/CallPanel";
import Alert from "@/components/ui/Alert";
import Avatar from "@/components/ui/Avatar";
import Modal from "@/components/ui/Modal";
import Spinner from "@/components/ui/Spinner";
import { ApiError, api, get, post } from "@/lib/api";
import { STATE_TONE, type ConsultMessage, type Consultation } from "@/lib/consult";
import { useMarkRead } from "@/lib/notifications";
import { faDateTime, faDigits, faTime, toman } from "@/lib/format";

function useCountdown(target: string | null) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!target) return setLeft(null);
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(target).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [target]);
  return left;
}

function fmtLeft(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return faDigits(h ? `${h} ساعت و ${m} دقیقه` : `${m} دقیقه`);
}

export default function ConsultRoom() {
  const { code } = useParams<{ code: string }>();
  const qc = useQueryClient();
  const consult = useQuery({ queryKey: ["consult", code], queryFn: () => get<Consultation>(`/me/consultations/${code}/`), refetchInterval: 15000 });
  const [messages, setMessages] = useState<ConsultMessage[]>([]);
  const lastId = useRef(0);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [summary, setSummary] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const c = consult.data;
  const left = useCountdown(c?.state === "waiting" ? c.doctor_deadline : c?.state === "active" ? c.closes_at : null);

  useEffect(() => {
    if (!c) return;
    let alive = true;
    const poll = async () => {
      try {
        const r = await get<{ messages: ConsultMessage[]; state: string; appointment_status: string }>(`/me/consultations/${code}/messages/?after=${lastId.current}`);
        if (r.messages.length) {
          lastId.current = r.messages[r.messages.length - 1].id;
          setMessages((m) => [...m, ...r.messages]);
        }
        if (r.state !== c.state || r.appointment_status !== c.appointment.status) qc.invalidateQueries({ queryKey: ["consult", code] });
      } catch {
        /* keep polling */
      }
      if (alive) setTimeout(poll, 3000);
    };
    poll();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, !!c]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  // being in the room = the messages are seen: clear this room's notifications
  const markRead = useMarkRead();
  useEffect(() => {
    markRead({ link: `/consult/${code}` });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, messages.length]);

  if (consult.isLoading) return <div className="grid h-[60vh] place-items-center text-brand-600"><Spinner className="size-8" /></div>;
  if (!c) return <div className="container-page py-10"><Alert tone="error">مشاوره یافت نشد یا به آن دسترسی ندارید.</Alert></div>;

  const isDoctor = c.role === "doctor";
  const appt = c.appointment;
  const open = appt.status === "confirmed" && c.state !== "closed";
  const peerName = isDoctor ? appt.patient_name : c.doctor.full_name;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !file) return;
    setSending(true);
    setError("");
    const fd = new FormData();
    fd.set("text", text);
    if (file) fd.set("file", file);
    try {
      await api(`/me/consultations/${code}/messages/`, { method: "POST", body: fd });
      setText("");
      setFile(null);
      if (isDoctor && c.state === "waiting") qc.invalidateQueries({ queryKey: ["consult", code] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "ارسال نشد");
    } finally {
      setSending(false);
    }
  };

  const action = async (path: string, body?: object) => {
    setError("");
    try {
      await post(`/me/consultations/${code}/${path}/`, body);
      qc.invalidateQueries({ queryKey: ["consult", code] });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا");
    }
  };

  return (
    <div className="container-page grid gap-6 py-6 lg:grid-cols-[1fr_360px]">
      <section className="card flex h-[calc(100vh-140px)] min-h-[520px] flex-col overflow-hidden">
        <header className="flex items-center gap-3 border-b border-line p-4">
          {isDoctor ? <Avatar name={appt.patient_name} size={44} /> : <Avatar src={c.doctor.photo} name={c.doctor.full_name} gender={c.doctor.gender} size={44} />}
          <div className="min-w-0 flex-1">
            <b className="block truncate">{peerName}</b>
            <span className="text-xs text-muted">{c.kind_display}{c.is_instant ? " فوری" : ""} · کد {faDigits(appt.tracking_code)}</span>
          </div>
          <span className={`chip ${STATE_TONE[c.state]}`}>{appt.status === "cancelled" ? "لغو شده" : c.state_display}</span>
        </header>

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4">
          <div className="mx-auto max-w-md rounded-2xl bg-white p-4 text-sm ring-1 ring-line">
            <p className="mb-1 text-xs font-semibold text-muted">شرح حال بیمار</p>
            <p className="leading-7 whitespace-pre-line text-slate-700">{c.complaint}</p>
          </div>
          {messages.map((m) => {
            if (m.is_system) return <p key={m.id} className="mx-auto w-fit rounded-full bg-slate-200/70 px-3 py-1 text-center text-xs text-slate-600">{m.text}</p>;
            const mine = m.from_doctor === isDoctor;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-7 ${mine ? "rounded-br-sm bg-brand-600 text-white" : "rounded-bl-sm bg-white text-slate-800 ring-1 ring-line"}`}>
                  {m.text && <p className="whitespace-pre-line">{m.text}</p>}
                  {m.file && (
                    /\.(png|jpe?g|webp|gif)$/i.test(m.file) ? (
                      <a href={m.file} target="_blank" rel="noreferrer"><img src={m.file} alt="پیوست" className="mt-1 max-h-56 rounded-xl" /></a>
                    ) : (
                      <a href={m.file} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 underline"><FileText className="size-4" /> فایل پیوست</a>
                    )
                  )}
                  <span className={`mt-1 flex items-center gap-1 text-[10px] ${mine ? "text-brand-100" : "text-muted"}`}>{faTime(m.created_at)}{mine && <CheckCheck className="size-3" />}</span>
                </div>
              </div>
            );
          })}
        </div>

        {open ? (
          <form onSubmit={send} className="border-t border-line p-3">
            {file && <p className="mb-2 flex items-center gap-2 text-xs text-brand-700"><Paperclip className="size-3.5" /> {file.name} <button type="button" onClick={() => setFile(null)} className="text-rose-600">حذف</button></p>}
            {error && <div className="mb-2"><Alert tone="error">{error}</Alert></div>}
            <div className="flex items-end gap-2">
              <label className="btn-ghost cursor-pointer p-2.5" aria-label="پیوست">
                <Paperclip className="size-5" />
                <input type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </label>
              <textarea
                className="input min-h-11 flex-1 resize-none"
                rows={1}
                placeholder={isDoctor && c.state === "waiting" ? "پاسخ شما (ارسال اولین پیام، مشاوره را آغاز می‌کند)" : "پیام خود را بنویسید..."}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); (e.currentTarget.form as HTMLFormElement).requestSubmit(); } }}
              />
              <button className="btn-primary p-3" disabled={sending || (!text.trim() && !file)} aria-label="ارسال">{sending ? <Spinner className="size-4" /> : <Send className="size-5 rotate-180" />}</button>
            </div>
          </form>
        ) : (
          <div className="border-t border-line bg-slate-50 p-4 text-center text-sm text-muted">
            {appt.status === "pending_payment" ? <Link href={`/booking/${appt.tracking_code}`} className="btn-primary">تکمیل پرداخت</Link> : "این مشاوره بسته شده است."}
          </div>
        )}
      </section>

      <aside className="space-y-4">
        {c.kind !== "text" && (
          <CallPanel code={code} video={c.kind === "video"} enabled={open} peerName={peerName} />
        )}
        <div className="card space-y-3 p-4 text-sm">
          {c.state === "waiting" && open && left !== null && (
            <p className="flex items-center gap-2 text-amber-700">
              <Clock className="size-4" />
              {isDoctor ? `مهلت پاسخ شما: ${fmtLeft(left)}` : c.is_instant ? `در انتظار پذیرش پزشک (${fmtLeft(left)})` : c.kind === "text" ? `پاسخ پزشک حداکثر تا ${fmtLeft(left)} دیگر` : `زمان تماس: ${faDateTime(appt.start)}`}
            </p>
          )}
          {c.state === "active" && c.closes_at && left !== null && <p className="flex items-center gap-2 text-emerald-700"><Clock className="size-4" /> گفتگو تا {fmtLeft(left)} دیگر باز است</p>}
          <dl className="space-y-2">
            <div className="flex justify-between"><dt className="text-muted">{isDoctor ? "بیمار" : "پزشک"}</dt><dd className="font-semibold">{peerName}</dd></div>
            {!isDoctor && <div className="flex justify-between"><dt className="text-muted">تخصص</dt><dd>{c.doctor.specialty}</dd></div>}
            {isDoctor && <div className="flex justify-between"><dt className="text-muted">کد ملی</dt><dd>{faDigits(appt.patient_national_code)}</dd></div>}
            {c.kind !== "text" && !c.is_instant && <div className="flex justify-between"><dt className="text-muted">زمان تماس</dt><dd>{faDateTime(appt.start)}</dd></div>}
            <div className="flex justify-between"><dt className="text-muted">مبلغ</dt><dd>{toman(appt.paid_amount || appt.price)}</dd></div>
          </dl>
          {c.doctor_summary && (
            <div className="rounded-xl bg-brand-50 p-3 text-brand-900">
              <p className="mb-1 flex items-center gap-1 text-xs font-bold"><Stethoscope className="size-4" /> جمع‌بندی و توصیه پزشک</p>
              <p className="leading-7 whitespace-pre-line">{c.doctor_summary}</p>
            </div>
          )}
          {isDoctor && open && c.state === "waiting" && c.kind !== "text" && (
            <button className="btn-primary w-full" onClick={() => action("accept")}>پذیرش و شروع مشاوره</button>
          )}
          {isDoctor && open && c.state === "active" && (
            <button className="btn-outline w-full" onClick={() => setClosing(true)}>پایان مشاوره و ثبت توصیه</button>
          )}
          {!isDoctor && open && c.state === "waiting" && (
            <button className="btn-ghost w-full text-rose-600" onClick={() => confirm("مشاوره لغو و مبلغ به کیف پول بازگردانده شود؟") && action("cancel")}>لغو و استرداد کامل</button>
          )}
          {!isDoctor && appt.can_review && <Link href="/panel/appointments?scope=past" className="btn-primary w-full">ثبت نظر درباره پزشک</Link>}
          <Link href={isDoctor ? "/doctor-panel/consult" : "/panel/consultations"} className="btn-ghost w-full">بازگشت به لیست مشاوره‌ها</Link>
        </div>
      </aside>

      <Modal open={closing} onClose={() => setClosing(false)} title="پایان مشاوره">
        <div className="space-y-3">
          <textarea className="input" rows={5} placeholder="جمع‌بندی، تشخیص احتمالی، توصیه‌ها و داروها (برای بیمار نمایش داده می‌شود)" value={summary} onChange={(e) => setSummary(e.target.value)} />
          <button className="btn-primary w-full" onClick={async () => { await action("close", { summary }); setClosing(false); }}>ثبت و پایان مشاوره</button>
        </div>
      </Modal>
    </div>
  );
}
