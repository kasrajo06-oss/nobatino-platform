"use client";

import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Smartphone } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { panelHome } from "@/components/layout/Header";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import { ApiError, post } from "@/lib/api";
import { BRAND } from "@/lib/config";
import { faDigits, toEnDigits } from "@/lib/format";
import type { User } from "@/lib/types";

export default function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const qc = useQueryClient();
  const [step, setStep] = useState<"mobile" | "code">("mobile");
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [timer, setTimer] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timer <= 0) return;
    const t = setTimeout(() => setTimer((x) => x - 1), 1000);
    return () => clearTimeout(t);
  }, [timer]);

  const requestCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await post<{ mobile: string; resend_in: number }>("/auth/otp/request/", { mobile: toEnDigits(mobile) });
      setMobile(r.mobile);
      setTimer(r.resend_in);
      setStep("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "خطا در ارسال کد");
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
      router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : r.is_new ? "/panel/profile" : panelHome(r.user.role));
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "کد نادرست است");
      setBusy(false);
    }
  };

  return (
    <div className="card w-full max-w-sm p-6 shadow-sm">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><Smartphone className="size-6" /></span>
        <h1 className="text-xl font-extrabold">ورود / ثبت‌نام در {BRAND}</h1>
        <p className="mt-1 text-sm text-muted">{step === "mobile" ? "شماره موبایل خود را وارد کنید" : `کد ۵ رقمی ارسال‌شده به ${faDigits(mobile)} را وارد کنید`}</p>
      </div>

      {step === "mobile" ? (
        <form onSubmit={requestCode} className="space-y-4">
          <input
            autoFocus
            inputMode="tel"
            dir="ltr"
            className="input text-center text-lg tracking-widest"
            placeholder="09xx xxx xxxx"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            aria-label="شماره موبایل"
          />
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full py-3" disabled={busy || toEnDigits(mobile).replace(/\D/g, "").length < 10}>
            {busy ? <Spinner className="size-4" /> : "دریافت کد تأیید"}
          </button>
          <p className="text-center text-xs leading-6 text-muted">ورود شما به معنای پذیرش قوانین و حریم خصوصی است.</p>
        </form>
      ) : (
        <div className="space-y-4">
          <input
            ref={codeRef}
            inputMode="numeric"
            autoComplete="one-time-code"
            dir="ltr"
            maxLength={5}
            className="input text-center text-2xl tracking-[0.6em]"
            value={code}
            onChange={(e) => {
              const v = toEnDigits(e.target.value).replace(/\D/g, "").slice(0, 5);
              setCode(v);
              if (v.length === 5) verify(v);
            }}
            aria-label="کد تأیید"
          />
          {error && <Alert tone="error">{error}</Alert>}
          <button className="btn-primary w-full py-3" disabled={busy || code.length !== 5} onClick={() => verify(code)}>
            {busy ? <Spinner className="size-4" /> : "ورود"}
          </button>
          <div className="flex items-center justify-between text-sm">
            <button className="inline-flex items-center gap-1 text-slate-600" onClick={() => { setStep("mobile"); setCode(""); setError(""); }}>
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
  );
}
