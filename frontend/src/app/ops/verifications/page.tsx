"use client";

import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageTitle, Tabs } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Alert from "@/components/ui/Alert";
import Empty from "@/components/ui/Empty";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, post } from "@/lib/api";
import { faDate, faDigits } from "@/lib/format";

type Doc = { id: number; short_id: string; slug: string; full_name: string; mobile: string; medical_council_no: string; specialty: string; verification_status: string; status_display: string; rejection_reason: string; documents: { kind: string; url: string }[]; created_at: string };
type Center = { id: number; slug: string; name: string; type_display: string; city_name: string; phone: string; verification_status: string; status_display: string; created_at: string };

export default function Verifications() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"doctors" | "centers">(typeof window !== "undefined" && location.search.includes("centers") ? "centers" : "doctors");
  const [status, setStatus] = useState("pending");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const doctors = useList<Doc>("ops-doctors", "/ops/doctors/", { status, q, page });
  const centers = useList<Center>("ops-centers", "/ops/centers/", { status, q, page });
  const [error, setError] = useState("");

  const act = async (kind: string, id: number, action: "approve" | "reject") => {
    setError("");
    let body = {};
    if (action === "reject") {
      const reason = prompt("دلیل رد (برای کاربر نمایش داده می‌شود):");
      if (!reason) return;
      body = { reason };
    }
    try {
      await post(`/ops/${kind}/${id}/${action}/`, body);
      qc.invalidateQueries({ queryKey: [`ops-${kind}`] });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "خطا");
    }
  };

  return (
    <>
      <PageTitle>احراز پزشکان و مراکز</PageTitle>
      <Tabs value={tab} onChange={(t) => { setTab(t); setPage(1); }} items={[["doctors", "پزشکان"], ["centers", "مراکز درمانی"]]} />
      <div className="card mb-4 flex flex-wrap gap-2 p-3">
        <select className="input w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="pending">در انتظار تأیید</option>
          <option value="approved">تأیید شده</option>
          <option value="rejected">رد شده</option>
          <option value="draft">پیش‌نویس</option>
          <option value="">همه</option>
        </select>
        <input className="input flex-1" placeholder="جستجو: نام، موبایل، نظام پزشکی" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      {error && <div className="mb-3"><Alert tone="error">{error}</Alert></div>}
      {tab === "doctors" ? (
        doctors.data?.results.length ? (
          <div className="space-y-3">
            {doctors.data.results.map((d) => (
              <div key={d.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <b>{d.full_name}</b>
                  <span className="text-xs text-brand-700">{d.specialty}</span>
                  <span className="ms-auto"><StatusChip status={d.verification_status} label={d.status_display} /></span>
                </div>
                <p className="text-xs text-muted">موبایل {faDigits(d.mobile)} · نظام پزشکی {faDigits(d.medical_council_no)} · ثبت {faDate(d.created_at)}</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  {d.documents.map((doc, i) => <a key={i} href={doc.url} target="_blank" rel="noreferrer" className="chip bg-brand-50 text-brand-700 ring-brand-100">{doc.kind}</a>)}
                  {!d.documents.length && <span className="text-rose-600">مدرکی بارگذاری نشده</span>}
                </div>
                <div className="flex gap-2 pt-1">
                  {d.verification_status !== "approved" && <button className="btn-primary py-2" onClick={() => act("doctors", d.id, "approve")}>تأیید</button>}
                  {d.verification_status !== "rejected" && <button className="btn-ghost py-2 text-rose-600" onClick={() => act("doctors", d.id, "reject")}>رد</button>}
                  {d.verification_status === "approved" && <Link href={`/doctor/${d.slug}/${d.short_id}`} className="btn-ghost py-2">صفحه عمومی</Link>}
                </div>
              </div>
            ))}
            <Pager page={page} count={doctors.data.count} onPage={setPage} />
          </div>
        ) : <Empty title="موردی وجود ندارد" />
      ) : centers.data?.results.length ? (
        <div className="space-y-3">
          {centers.data.results.map((c) => (
            <div key={c.id} className="card flex flex-wrap items-center gap-3 p-4">
              <div className="flex-1">
                <b>{c.name}</b>
                <p className="text-xs text-muted">{c.type_display} · {c.city_name} · {c.phone}</p>
              </div>
              <StatusChip status={c.verification_status} label={c.status_display} />
              {c.verification_status !== "approved" && <button className="btn-primary py-2" onClick={() => act("centers", c.id, "approve")}>تأیید</button>}
              {c.verification_status !== "rejected" && <button className="btn-ghost py-2 text-rose-600" onClick={() => act("centers", c.id, "reject")}>رد</button>}
            </div>
          ))}
          <Pager page={page} count={centers.data.count} onPage={setPage} />
        </div>
      ) : <Empty title="موردی وجود ندارد" />}
    </>
  );
}
