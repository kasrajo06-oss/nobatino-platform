"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, get, post } from "@/lib/api";
import { faDate, toEnDigits, toman } from "@/lib/format";
import { StatCard } from "./PanelShell";

type Finance = {
  gross: number; commission: number; net: number; settled: number; available: number;
  settlements: { id: number; amount: number; iban: string; status: string; status_display: string; bank_ref: string; created_at: string }[];
};

export default function FinancePanel({ base }: { base: string }) {
  const qc = useQueryClient();
  const data = useQuery({ queryKey: ["finance", base], queryFn: () => get<Finance>(`${base}/finance/`) });
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const f = data.data;

  const request = async () => {
    try {
      await post(`${base}/finance/`, { amount: Number(toEnDigits(amount)), iban });
      setMsg({ tone: "success", text: "درخواست تسویه ثبت شد." });
      setAmount("");
      qc.invalidateQueries({ queryKey: ["finance", base] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="درآمد ناخالص آنلاین" value={toman(f?.gross ?? 0)} />
        <StatCard label="کارمزد سامانه" value={toman(f?.commission ?? 0)} />
        <StatCard label="تسویه‌شده / در جریان" value={toman(f?.settled ?? 0)} />
        <StatCard label="قابل برداشت" value={<span className="text-brand-700">{toman(f?.available ?? 0)}</span>} />
      </div>
      <div className="card grid gap-2 p-4 sm:grid-cols-[1fr_1.5fr_auto]">
        <input className="input" dir="ltr" inputMode="numeric" placeholder="مبلغ (تومان)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        <input className="input" dir="ltr" placeholder="IR000000000000000000000000" value={iban} onChange={(e) => setIban(e.target.value)} />
        <button className="btn-primary" onClick={request} disabled={!amount || !iban}>درخواست تسویه</button>
        {msg && <div className="sm:col-span-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      </div>
      <div className="card divide-y divide-line">
        {f?.settlements.map((s) => (
          <div key={s.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <b>{toman(s.amount)}</b>
            <span className="ltr text-xs text-muted">{s.iban}</span>
            <span className="text-xs text-muted">{faDate(s.created_at)}</span>
            {s.bank_ref && <span className="text-xs">پیگیری: {s.bank_ref}</span>}
            <span className="ms-auto"><StatusChip status={s.status} label={s.status_display} /></span>
          </div>
        ))}
        {!f?.settlements.length && <p className="p-4 text-center text-sm text-muted">درخواست تسویه‌ای ثبت نشده است.</p>}
      </div>
    </div>
  );
}
