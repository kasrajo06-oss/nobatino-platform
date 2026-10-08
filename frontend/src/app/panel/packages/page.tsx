"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, get, post } from "@/lib/api";
import { faDate, toman } from "@/lib/format";
import type { PackageOrder } from "@/lib/offers";
import type { Paginated } from "@/lib/types";

export default function MyPackages() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["my-packages"], queryFn: () => get<Paginated<PackageOrder>>("/me/package-orders/") });
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const cancel = async (o: PackageOrder) => {
    if (!confirm("خرید لغو و مبلغ به کیف پول بازگردانده شود؟")) return;
    try {
      const r = await post<{ refunded: number }>(`/me/package-orders/${o.id}/cancel/`);
      setMsg({ tone: "success", text: r.refunded ? `لغو شد و ${toman(r.refunded)} به کیف پول برگشت.` : "لغو شد." });
      qc.invalidateQueries({ queryKey: ["my-packages"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  return (
    <>
      <PageTitle action={<Link href="/offer" className="btn-primary py-2">مشاهده پکیج‌ها</Link>}>خریدهای خدمات</PageTitle>
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {list.data?.results.length ? (
        <div className="space-y-3">
          {list.data.results.map((o) => (
            <div key={o.id} className="card flex flex-wrap items-center gap-4 p-4">
              <div className="min-w-0 flex-1">
                <b className="block">{o.package.title}</b>
                <span className="text-sm text-brand-700">{o.package.provider_name}</span>
                <p className="mt-1 text-xs text-muted">
                  {toman(o.price)}{o.expires_at && o.status === "paid" ? ` · مهلت استفاده تا ${faDate(o.expires_at)}` : ""}
                </p>
              </div>
              {o.voucher_code && <span className="ltr rounded-xl bg-brand-50 px-3 py-2 font-black tracking-widest text-brand-800">{o.voucher_code}</span>}
              <StatusChip status={o.status === "paid" ? "approved" : o.status === "used" ? "attended" : o.status === "pending_payment" ? "pending" : "cancelled"} label={o.status_display} />
              <div className="flex gap-2">
                {o.status === "pending_payment" && <Link href={`/orders/${o.id}`} className="btn-primary py-2">پرداخت</Link>}
                {o.status === "paid" && <button onClick={() => cancel(o)} className="btn-ghost py-2 text-rose-600">لغو و استرداد</button>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Empty title="هنوز خریدی ندارید"><Link href="/offer" className="text-brand-700">خدمات تخفیف‌دار</Link></Empty>
      )}
    </>
  );
}
