"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarCheck, Clock, MapPin, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, get, post } from "@/lib/api";
import { faDateTime, faDigits, toman } from "@/lib/format";
import type { Appointment } from "@/lib/types";

export default function CheckoutPage() {
  const { code } = useParams<{ code: string }>();
  const router = useRouter();
  const appt = useQuery({ queryKey: ["appointment", code], queryFn: () => get<Appointment>(`/me/appointments/${code}/`) });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => get<{ balance: number }>("/me/wallet/") });
  const [useWallet, setUseWallet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const until = appt.data?.held_until;
    if (!until || appt.data?.status !== "pending_payment") return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(until).getTime() - Date.now()) / 1000)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [appt.data]);

  if (appt.isLoading) return <div className="grid h-[50vh] place-items-center text-brand-600"><Spinner className="size-8" /></div>;
  if (!appt.data) return <div className="container-page py-10"><Alert tone="error">نوبت یافت نشد.</Alert></div>;
  const a = appt.data;
  const balance = wallet.data?.balance ?? 0;
  const fromWallet = useWallet ? Math.min(balance, a.price) : 0;

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ status?: string; redirect_url?: string }>("/payments/start/", { tracking_code: a.tracking_code, use_wallet: useWallet });
      if (r.redirect_url) window.location.href = r.redirect_url;
      else router.replace(`/payment/result?status=success&tracking_code=${a.tracking_code}`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در پرداخت");
      setBusy(false);
    }
  };

  return (
    <div className="container-page max-w-2xl py-8">
      <div className="card space-y-5 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">{a.status === "pending_payment" ? "تکمیل رزرو" : "جزئیات نوبت"}</h1>
          <StatusChip status={a.status} label={a.status_display} />
        </div>
        {a.status === "confirmed" && <Alert tone="success">نوبت شما با موفقیت ثبت شد. کد پیگیری پیامک شد.</Alert>}
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className="text-muted">{a.kind === "lab" ? "مرکز" : "پزشک"}</dt><dd className="font-bold">{a.provider_name}</dd><dd className="text-xs text-brand-700">{a.specialty}</dd></div>
          <div><dt className="text-muted">بیمار</dt><dd className="font-bold">{a.patient_name}</dd><dd className="text-xs text-muted">کد ملی {faDigits(a.patient_national_code)}</dd></div>
          <div className="flex gap-2"><CalendarCheck className="size-4 text-brand-600" /><span>{faDateTime(a.start)}</span></div>
          <div className="flex gap-2"><MapPin className="size-4 shrink-0 text-brand-600" /><span className="text-xs leading-6">{a.address}</span></div>
          <div><dt className="text-muted">کد پیگیری</dt><dd className="ltr text-right text-lg font-black tracking-widest">{faDigits(a.tracking_code)}</dd></div>
        </dl>

        {a.status === "pending_payment" && (
          <div className="space-y-3 border-t border-line pt-4">
            {left !== null && (
              <p className={`flex items-center gap-1.5 text-sm ${left < 120 ? "text-rose-600" : "text-amber-700"}`}>
                <Clock className="size-4" /> این نوبت تا {faDigits(`${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`)} دقیقه برای شما نگه داشته می‌شود.
              </p>
            )}
            <div className="flex justify-between text-sm"><span>مبلغ رزرو</span><b>{toman(a.price)}</b></div>
            {balance > 0 && (
              <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span className="flex items-center gap-2"><Wallet className="size-4 text-brand-600" /> استفاده از کیف پول (موجودی {toman(balance)})</span>
                <input type="checkbox" className="accent-brand-600" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
              </label>
            )}
            <div className="flex justify-between border-t border-dashed border-line pt-3"><span>قابل پرداخت</span><b className="text-lg text-brand-700">{toman(a.price - fromWallet)}</b></div>
            {error && <Alert tone="error">{error}</Alert>}
            <button className="btn-primary w-full py-3" onClick={pay} disabled={busy || left === 0}>
              {busy ? <Spinner className="size-4" /> : a.price - fromWallet > 0 ? "پرداخت و ثبت نهایی" : "ثبت نهایی با کیف پول"}
            </button>
          </div>
        )}
        <div className="flex gap-2 border-t border-line pt-4">
          <Link href="/panel/appointments" className="btn-outline flex-1">نوبت‌های من</Link>
          {a.provider_url && <Link href={a.provider_url} className="btn-ghost flex-1">صفحه {a.kind === "lab" ? "مرکز" : "پزشک"}</Link>}
        </div>
      </div>
    </div>
  );
}
