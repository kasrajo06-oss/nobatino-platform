"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Ticket, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Alert from "@/components/ui/Alert";
import Spinner from "@/components/ui/Spinner";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, get, post } from "@/lib/api";
import { faDate, toman } from "@/lib/format";
import type { PackageOrder } from "@/lib/offers";

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const order = useQuery({ queryKey: ["package-order", id], queryFn: () => get<PackageOrder>(`/me/package-orders/${id}/`) });
  const wallet = useQuery({ queryKey: ["wallet"], queryFn: () => get<{ balance: number }>("/me/wallet/") });
  const [useWallet, setUseWallet] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (order.isLoading) return <div className="grid h-[50vh] place-items-center text-brand-600"><Spinner className="size-8" /></div>;
  if (!order.data) return <div className="container-page py-10"><Alert tone="error">سفارش یافت نشد.</Alert></div>;
  const o = order.data;
  const balance = wallet.data?.balance ?? 0;
  const fromWallet = useWallet ? Math.min(balance, o.price) : 0;

  const pay = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await post<{ status?: string; redirect_url?: string }>(`/me/package-orders/${o.id}/pay/`, { use_wallet: useWallet });
      if (r.redirect_url) window.location.href = r.redirect_url;
      else {
        await order.refetch();
        router.refresh();
        setBusy(false);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا در پرداخت");
      setBusy(false);
    }
  };

  return (
    <div className="container-page max-w-2xl py-10">
      <div className="card space-y-6 p-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">{o.status === "pending_payment" ? "تکمیل خرید" : "کد استفاده از خدمت"}</h1>
          <StatusChip status={o.status === "paid" ? "approved" : o.status === "pending_payment" ? "pending" : o.status === "used" ? "attended" : "cancelled"} label={o.status_display} />
        </div>
        <div>
          <b className="text-lg">{o.package.title}</b>
          <p className="text-sm text-brand-700">{o.package.provider_name}</p>
        </div>
        {o.voucher_code && (
          <div className="rounded-3xl border-2 border-dashed border-brand-300 bg-brand-50 p-6 text-center">
            <Ticket className="mx-auto size-8 text-brand-600" />
            <p className="mt-2 text-sm text-slate-600">این کد را هنگام مراجعه به {o.package.provider_name} ارائه دهید</p>
            <p className="ltr mt-3 text-3xl font-black tracking-[0.3em] text-brand-800">{o.voucher_code}</p>
            {o.expires_at && <p className="mt-2 text-xs text-muted">مهلت استفاده تا {faDate(o.expires_at)}</p>}
          </div>
        )}
        {o.status === "paid" && <Alert tone="success"><span className="flex items-center gap-2"><CheckCircle2 className="size-4" /> پرداخت انجام شد و کد پیامک شد.</span></Alert>}
        {o.status === "pending_payment" && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span>مبلغ</span><b>{toman(o.price)}</b></div>
            {balance > 0 && (
              <label className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                <span className="flex items-center gap-2"><Wallet className="size-4 text-brand-600" /> استفاده از کیف پول ({toman(balance)})</span>
                <input type="checkbox" className="accent-brand-600" checked={useWallet} onChange={(e) => setUseWallet(e.target.checked)} />
              </label>
            )}
            <div className="flex justify-between border-t border-dashed border-line pt-3"><span>قابل پرداخت</span><b className="text-lg text-brand-700">{toman(o.price - fromWallet)}</b></div>
            {error && <Alert tone="error">{error}</Alert>}
            <button className="btn-primary w-full py-3" onClick={pay} disabled={busy}>{busy ? <Spinner className="size-4" /> : "پرداخت"}</button>
          </div>
        )}
        <div className="flex gap-2 border-t border-line pt-4">
          <Link href="/panel/packages" className="btn-outline flex-1">خریدهای من</Link>
          <Link href={`/offer/${o.package.slug}`} className="btn-ghost flex-1">صفحه پکیج</Link>
        </div>
      </div>
    </div>
  );
}
