"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Eye, PenLine, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { PageTitle, Tabs } from "@/components/panel/PanelShell";
import { Pager, useList } from "@/components/panel/useList";
import Alert from "@/components/ui/Alert";
import Markdown from "@/components/ui/Markdown";
import StatusChip from "@/components/ui/StatusChip";
import { ApiError, api, get } from "@/lib/api";
import { faDate, num } from "@/lib/format";
import type { MagCategory } from "@/lib/magazine";
import type { Specialty } from "@/lib/types";

type Row = {
  id?: number; title: string; slug: string; category: number | ""; excerpt: string; body: string; author_name: string;
  reviewed_by: string | null; specialties: number[]; status: "draft" | "published"; is_featured: boolean;
  seo_title: string; seo_description: string; views?: number; updated_at?: string; cover?: string | null;
};
const EMPTY: Row = { title: "", slug: "", category: "", excerpt: "", body: "## عنوان بخش\n\nمتن مقاله...", author_name: "تیم تحریریه", reviewed_by: null, specialties: [], status: "draft", is_featured: false, seo_title: "", seo_description: "" };

export default function OpsArticles() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useList<Row>("ops-articles", "/ops/articles/", { status, page });
  const cats = useQuery({ queryKey: ["ops-mag-cats"], queryFn: () => get<MagCategory[]>("/ops/article-categories/") });
  const specs = useQuery({ queryKey: ["specialties-all"], queryFn: () => get<Specialty[]>("/specialties/") });
  const [editing, setEditing] = useState<Row | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  const save = async () => {
    if (!editing) return;
    setMsg(null);
    const fd = new FormData();
    const { id, views: _v, updated_at: _u, cover: _c, specialties, ...rest } = editing;
    void _v; void _u; void _c;
    Object.entries(rest).forEach(([k, v]) => v !== null && v !== undefined && fd.append(k, String(v)));
    specialties.forEach((s) => fd.append("specialties", String(s)));
    if (cover) fd.append("cover", cover);
    try {
      await api(`/ops/articles/${id ? `${id}/` : ""}`, { method: id ? "PATCH" : "POST", body: fd });
      setMsg({ tone: "success", text: "مقاله ذخیره شد." });
      setEditing(null);
      setCover(null);
      qc.invalidateQueries({ queryKey: ["ops-articles"] });
    } catch (e) {
      setMsg({ tone: "error", text: e instanceof ApiError ? e.message : "خطا" });
    }
  };

  if (editing) {
    return (
      <>
        <PageTitle action={<button className="btn-ghost" onClick={() => setEditing(null)}>بازگشت</button>}>{editing.id ? "ویرایش مقاله" : "مقاله جدید"}</PageTitle>
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <div className="card space-y-4 p-5">
            <input className="input text-lg font-bold" placeholder="عنوان مقاله" value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} />
            <input className="input ltr text-left" placeholder="slug (english-words-with-dash)" value={editing.slug} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
            <textarea className="input" rows={2} placeholder="خلاصه (زیر عنوان و در کارت‌ها نمایش داده می‌شود)" value={editing.excerpt} onChange={(e) => setEditing({ ...editing, excerpt: e.target.value })} />
            <Tabs value={tab} onChange={setTab} items={[["write", "نوشتن"], ["preview", "پیش‌نمایش"]]} />
            {tab === "write" ? (
              <textarea className="input min-h-[420px] font-mono text-sm leading-7" value={editing.body} onChange={(e) => setEditing({ ...editing, body: e.target.value })} />
            ) : (
              <div className="min-h-[420px] rounded-xl border border-line p-5"><Markdown source={editing.body} /></div>
            )}
            <p className="text-xs leading-6 text-muted">راهنما: <code>## تیتر</code>، <code>### تیتر کوچک</code>، <code>- مورد</code>، <code>1. مورد</code>، <code>&gt; نکته مهم</code>، <code>**پررنگ**</code>، <code>[متن](/doctors)</code> — بین پاراگراف‌ها یک خط خالی بگذارید.</p>
          </div>
          <div className="space-y-4">
            <div className="card space-y-3 p-5 text-sm">
              <label className="block">وضعیت
                <select className="input mt-1" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value as Row["status"] })}>
                  <option value="draft">پیش‌نویس</option>
                  <option value="published">منتشر شده</option>
                </select>
              </label>
              <label className="block">دسته
                <select className="input mt-1" value={editing.category} onChange={(e) => setEditing({ ...editing, category: Number(e.target.value) })}>
                  <option value="">انتخاب کنید</option>
                  {cats.data?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="block">نام نویسنده<input className="input mt-1" value={editing.author_name} onChange={(e) => setEditing({ ...editing, author_name: e.target.value })} /></label>
              <label className="block">بازبینی علمی (شناسه کوتاه پزشک)<input className="input ltr mt-1" placeholder="مثلاً AbC123" value={editing.reviewed_by ?? ""} onChange={(e) => setEditing({ ...editing, reviewed_by: e.target.value || null })} /></label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-brand-600" checked={editing.is_featured} onChange={(e) => setEditing({ ...editing, is_featured: e.target.checked })} /> مقاله ویژه</label>
              <label className="block">تصویر شاخص<input type="file" accept="image/*" className="mt-1 block w-full text-xs" onChange={(e) => setCover(e.target.files?.[0] ?? null)} /></label>
            </div>
            <div className="card p-5 text-sm">
              <span className="label">تخصص‌های مرتبط (برای پیشنهاد پزشک)</span>
              <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
                {specs.data?.map((s) => {
                  const on = editing.specialties.includes(s.id);
                  return <button key={s.id} type="button" onClick={() => setEditing({ ...editing, specialties: on ? editing.specialties.filter((x) => x !== s.id) : [...editing.specialties, s.id] })} className={`chip px-2.5 py-1 ${on ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-600 ring-line"}`}>{s.name}</button>;
                })}
              </div>
            </div>
            <div className="card space-y-3 p-5 text-sm">
              <input className="input" placeholder="عنوان سئو (اختیاری)" value={editing.seo_title} onChange={(e) => setEditing({ ...editing, seo_title: e.target.value })} />
              <textarea className="input" rows={2} placeholder="توضیحات متا (اختیاری)" value={editing.seo_description} onChange={(e) => setEditing({ ...editing, seo_description: e.target.value })} />
            </div>
            {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
            <button className="btn-primary w-full" onClick={save}>ذخیره</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle action={<button className="btn-primary py-2" onClick={() => { setEditing({ ...EMPTY }); setTab("write"); }}><Plus className="size-4" /> مقاله جدید</button>}>مجله سلامت</PageTitle>
      {msg && <div className="mb-3"><Alert tone={msg.tone}>{msg.text}</Alert></div>}
      <select className="input mb-4 w-auto" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
        <option value="">همه</option>
        <option value="published">منتشر شده</option>
        <option value="draft">پیش‌نویس</option>
      </select>
      <div className="card divide-y divide-line">
        {list.data?.results.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-3 p-4 text-sm">
            <b className="flex-1">{r.title}</b>
            <StatusChip status={r.status === "published" ? "approved" : "draft"} label={r.status === "published" ? "منتشر شده" : "پیش‌نویس"} />
            <span className="text-xs text-muted">{num(r.views ?? 0)} بازدید · {r.updated_at && faDate(r.updated_at)}</span>
            {r.status === "published" && <Link href={`/mag/${r.slug}`} target="_blank" className="btn-ghost p-2" aria-label="مشاهده"><Eye className="size-4" /></Link>}
            <button className="btn-ghost p-2" aria-label="ویرایش" onClick={async () => { setEditing(await get<Row>(`/ops/articles/${r.id}/`)); setTab("write"); }}><PenLine className="size-4" /></button>
          </div>
        ))}
      </div>
      {list.data && <Pager page={page} count={list.data.count} onPage={setPage} />}
    </>
  );
}
