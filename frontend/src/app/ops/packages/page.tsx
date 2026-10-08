"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageTitle, Tabs } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, get, post } from "@/lib/api";
import { faDate, toman } from "@/lib/format";
import type { PackageOrder } from "@/lib/offers";

type P = { id: number; title: string; provider_name: string; price: number; original_price: number; status: string; status_display: string; sold_count: number; summary: string };

export default function OpsPackages() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"review" | "orders">("review");
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const list = useList<P>("ops-packages", "/ops/packages/", { status, page });
  const [q, setQ] = useState("");
  const [orders, setOrders] = useState<PackageOrder[] | null>(null);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const act = async (id: number, action: "approve" | "reject") => {
    const body = action === "reject" ? { reason: prompt("دلیل رد:") } : {};
    if (action === "reject" && !body.reason) return;
    try {
      await post(`/ops/packages/${id}/${action}/`, body);
      qc.invalidateQueries({ queryKey: ["ops-packages"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };
  const search = async () => setOrders(await get<PackageOrder[]>(`/ops/package-orders/?q=${encodeURIComponent(q)}`));
  const refund = async (code: string) => {
    if (!confirm("مبلغ به کیف پول خریدار بازگردانده شود؟")) return;
    try {
      const r = await post<{ refunded: number }>("/ops/package-orders/", { voucher_code: code });
      setMsg({ tone: "success", text: `مسترد شد: ${toman(r.refunded)}` });
      search();
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };

  return (
    <>
      <PageTitle>پکیج‌های خدمات (کلینیک)</PageTitle>
      <Tabs value={tab} onChange={setTab} items={[["review", "بررسی پکیج‌ها"], ["orders", "پشتیبانی خریدها"]]} />
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      {tab === "review" ? (
        <>
          <select className="input mb-4 w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
            <option value="pending">در انتظار تأیید</option>
            <option value="approved">تأیید شده</option>
            <option value="rejected">رد شده</option>
          </select>
          {list.data?.results.length ? (
            <div className="space-y-3">
              {list.data.results.map((p) => (
                <div key={p.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <b>{p.title}</b> <span className="text-sm text-brand-700">— {p.provider_name}</span>
                    <p className="text-xs text-muted">{p.summary} · {toman(p.price)} (به جای {toman(p.original_price)}) · {p.sold_count} فروش</p>
                  </div>
                  <StatusChip status={p.status} label={p.status_display} />
                  {p.status !== "approved" && <button className="btn-primary py-1.5" onClick={() => act(p.id, "approve")}>تأیید</button>}
                  {p.status !== "rejected" && <button className="btn-ghost py-1.5 text-rose-600" onClick={() => act(p.id, "reject")}>رد</button>}
                </div>
              ))}
              <Pager page={page} count={list.data.count} onPage={setPage} />
            </div>
          ) : <Empty title="موردی وجود ندارد" />}
        </>
      ) : (
        <>
          <div className="card mb-4 flex gap-2 p-3">
            <input className="input flex-1" placeholder="کد استفاده یا موبایل خریدار" value={q} onChange={(e) => setQ(e.target.value)} />
            <button className="btn-primary" onClick={search}>جستجو</button>
          </div>
          <div className="card divide-y divide-line">
            {orders?.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
                <b className="flex-1">{o.package.title}</b>
                <span>{o.buyer_name} ({o.buyer_mobile})</span>
                <span className="ltr text-xs">{o.voucher_code}</span>
                <span>{toman(o.paid_amount)}</span>
                <span className="text-xs text-muted">{faDate(o.created_at)}</span>
                <StatusChip status={o.status === "paid" ? "approved" : o.status === "used" ? "attended" : "cancelled"} label={o.status_display} />
                {o.status === "paid" && <button className="btn-ghost py-1 text-rose-600" onClick={() => refund(o.voucher_code!)}>استرداد</button>}
              </div>
            ))}
            {orders && !orders.length && <p className="p-6 text-center text-sm text-muted">موردی یافت نشد.</p>}
          </div>
        </>
      )}
    </>
  );
}
