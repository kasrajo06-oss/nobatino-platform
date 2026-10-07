"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import { ApiError, get, post } from "@/lib/api";
import { faDate, toEnDigits, toman } from "@/lib/format";
import type { WalletTx } from "@/lib/types";

export default function WalletPage() {
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => get<{ balance: number; transactions: WalletTx[] }>("/me/wallet/") });
  const [amount, setAmount] = useState("100000");
  const [error, setError] = useState("");

  const topup = async () => {
    setError("");
    try {
      const r = await post<{ redirect_url: string }>("/payments/topup/", { amount: Number(toEnDigits(amount)) });
      window.location.href = r.redirect_url;
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };

  return (
    <>
      <PageTitle>کیف پول</PageTitle>
      <div className="card mb-5 grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <p className="text-sm text-muted">موجودی فعلی</p>
          <p className="mt-1 text-3xl font-black text-brand-700">{toman(wallet.data?.balance ?? 0)}</p>
        </div>
        <div className="space-y-2">
          <div className="flex gap-2">
            {[50000, 100000, 300000].map((v) => (
              <button key={v} onClick={() => setAmount(String(v))} className={`chip px-3 py-1.5 ${Number(amount) === v ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-line"}`}>{toman(v)}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="input" dir="ltr" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="مبلغ (تومان)" />
            <button className="btn-primary shrink-0" onClick={topup}>افزایش موجودی</button>
          </div>
          {error && <Alert tone="error">{error}</Alert>}
        </div>
      </div>
      <h2 className="mb-3 font-bold">تراکنش‌ها</h2>
      {wallet.data?.transactions.length ? (
        <div className="card divide-y divide-line">
          {wallet.data.transactions.map((t) => (
            <div key={t.id} className="flex items-center gap-3 p-4 text-sm">
              <div className="flex-1">
                <b>{t.kind_display}</b>
                <p className="text-xs text-muted">{t.description} · {faDate(t.created_at)}</p>
              </div>
              <b className={t.amount > 0 ? "text-emerald-600" : "text-rose-600"}>{t.amount > 0 ? "+" : "−"}{toman(Math.abs(t.amount))}</b>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="تراکنشی ثبت نشده است" />
      )}
    </>
  );
}
