"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, KeyRound, Smartphone } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { panelHome } from "@/components/layout/HeaderClient";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError, post } from "@/lib/api";
import { BRAND } from "@/lib/config";
import { faDigits, toEnDigits } from "@/lib/format";
import type { User } from "@/lib/types";

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";
const DEMO_ACCOUNTS = [
  ["09120000003", "بیمار"],
  ["09120000001", "پزشک"],
  ["09120000002", "آزمایشگاه"],
  ["09120000000", "اپراتور"],
];

export default function LoginForm() {
  const sp = useSearchParams();
  const qc = useQueryClient();
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [debugCode, setDebugCode] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const requestCode = async (e?: React.FormEvent, number = mobile) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ mobile: string; resend_in: number; debug_code?: string }>("/auth/otp/request/", { mobile: toEnDigits(number) });
      setMobile(r.mobile);
      setTimer(r.resend_in);
      setDebugCode(r.debug_code ?? null);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "خطا در ارسال کد";
      // a code was already sent to this number in the last minute: let the user type it
      if (err instanceof ApiError && err.status === 429 && msg.includes("قبلاً")) {
        setMobile(toEnDigits(number));
        setStep("code");
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (value: string) => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ user: User; is_new: boolean }>("/auth/otp/verify/", { mobile, code: toEnDigits(value) });
      qc.setQueryData(["me"], r.user);
      const next = sp.get("next");
      const target = next && next.startsWith("/") && !next.startsWith("//") ? next : r.is_new ? "/panel/profile" : panelHome(r.user.role);
      // full navigation: the client router may hold prefetched "redirect to /login" responses from before login
      window.location.assign(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "کد نادرست است");
      setBusy(false);
    }
  };

  return (
    <div className="grid w-full max-w-4xl overflow-hidden rounded-[2rem] bg-white shadow-xl ring-1 ring-line md:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-brand-900 p-10 text-white md:flex">
        <div>
          <h2 className="text-2xl font-black">به {BRAND} خوش آمدید</h2>
          <p className="mt-3 leading-8 text-brand-100">با یک کد پیامکی وارد شوید؛ بدون نیاز به رمز عبور. نوبت‌ها، مشاوره‌ها و جواب آزمایش‌ها همیشه در دسترس شماست.</p>
        </div>
        <ul className="space-y-3 text-sm text-brand-50">
          {["رزرو نوبت مطب و آزمایشگاه", "مشاوره تلفنی، متنی و ویدیویی", "کیف پول و استرداد آسان", "مدیریت نوبت اعضای خانواده"].map((x) => (
            <li key={x} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-brand-300" /> {x}</li>
          ))}
        </ul>
      </div>
      <div className="p-8 md:p-10">
        <div className="mb-8">
          <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Smartphone className="size-6" /></span>
          <h1 className="text-2xl font-extrabold">ورود / ثبت‌نام</h1>
          <p className="mt-2 text-sm text-muted">{step === "mobile" ? "شماره موبایل خود را وارد کنید" : `کد ۵ رقمی ارسال‌شده به ${faDigits(mobile)} را وارد کنید`}</p>
        </div>

        {step === "mobile" ? (
          <form onSubmit={requestCode} className="space-y-4">
            <input autoFocus inputMode="tel" dir="ltr" className="input py-3.5 text-center text-lg tracking-widest" placeholder="09xx xxx xxxx" value={mobile} onChange={(e) => setMobile(e.target.value)} aria-label="شماره موبایل" />
            {error && <Alert tone="error">{error}</Alert>}
            <button className="btn-primary w-full py-3.5" disabled={busy || toEnDigits(mobile).replace(/\D/g, "").length < 10}>
              {busy ? <Spinner className="size-4" /> : "دریافت کد تأیید"}
            </button>
            {DEMO && (
              <div className="rounded-2xl bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold text-slate-500">ورود سریع با حساب‌های نمایشی</p>
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_ACCOUNTS.map(([m, label]) => (
                    <button key={m} type="button" onClick={() => { setMobile(m); requestCode(undefined, m); }} className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-line hover:ring-brand-400">
                      <b className="block text-slate-800">{label}</b>
                      <span className="ltr text-xs text-muted">{faDigits(m)}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className="text-center text-xs leading-6 text-muted">ورود شما به معنای پذیرش قوانین و حریم خصوصی است.</p>
          </form>
        ) : (
          <div className="space-y-4">
            {debugCode && (
              <div className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                <KeyRound className="size-5 shrink-0" />
                <span className="flex-1">محیط آزمایشی (بدون سرویس پیامک) — کد شما: <b className="ltr tracking-widest">{debugCode}</b></span>
                <button className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-white" onClick={() => { setCode(debugCode); verify(debugCode); }}>ورود</button>
              </div>
            )}
            <input
              ref={codeRef}
              inputMode="numeric"
              autoComplete="one-time-code"
              dir="ltr"
              maxLength={5}
              className="input py-3.5 text-center text-2xl tracking-[0.6em]"
              value={code}
              onChange={(e) => {
                const v = toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 5);
                setCode(v);
                if (v.length === 5) verify(v);
              }}
              aria-label="کد تأیید"
            />
            {error && <Alert tone="error">{error}</Alert>}
            <button className="btn-primary w-full py-3.5" disabled={busy || code.length !== 5} onClick={() => verify(code)}>
              {busy ? <Spinner className="size-4" /> : "ورود"}
            </button>
            <div className="flex items-center justify-between text-sm">
              <button className="inline-flex items-center gap-1 text-slate-600" onClick={() => { setStep("mobile"); setCode(""); setError(""); setDebugCode(null); }}>
                <ArrowRight className="size-4" /> ویرایش شماره
              </button>
              {timer > 0 ? (
                <span className="text-muted">ارسال مجدد تا {faDigits(timer)} ثانیه</span>
              ) : (
                <button className="font-semibold text-brand-700" onClick={() => requestCode()} disabled={busy}>ارسال مجدد کد</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
