import type { Metadata } from "next";
import Link from "next/link";
import ArticleCard from "@/components/magazine/ArticleCard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Empty from "@/components/ui/Empty";
import Pagination from "@/components/ui/Pagination";
import { BRAND } from "@/lib/config";
import { num } from "@/lib/format";
import type { ArticleCard as Article, MagCategory } from "@/lib/magazine";
import { qs, serverGet } from "@/lib/server-api";
import type { Paginated } from "@/lib/types";

export const metadata: Metadata = {
  title: "مجله سلامت",
  description: `مقالات سلامت، راهنمای درمان و نکات پزشکی بازبینی‌شده توسط پزشکان در مجله سلامت ${BRAND}.`,
  alternates: { canonical: "/mag" },
};
export const dynamic = "force-dynamic";

export default async function MagazineHome({ searchParams }: { searchParams: Promise<{ page?: string; q?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page || 1));
  const [cats, featured, latest] = await Promise.all([
    serverGet<MagCategory[]>("/magazine/categories/", { revalidate: 300 }),
    serverGet<Paginated<Article>>("/magazine/articles/?featured=true&page_size=3", { revalidate: 120 }),
    serverGet<Paginated<Article>>(`/magazine/articles/${qs({ page, page_size: 12, q: sp.q })}`, { revalidate: 120 }),
  ]);
  const [hero, ...side] = featured.results;

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "مجله سلامت" }]} />
      <div className="mt-4 mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 md:text-4xl">مجله سلامت {BRAND}</h1>
          <p className="mt-2 text-muted">راهنمای درمان، نکات سلامت و آموزش استفاده از خدمات؛ با بازبینی پزشکان</p>
        </div>
        <form action="/mag" className="flex gap-2">
          <input name="q" defaultValue={sp.q} placeholder="جستجو در مقالات..." className="input md:w-72" />
          <button className="btn-primary">جستجو</button>
        </form>
      </div>

      {!sp.q && page === 1 && hero && (
        <section className="mb-12 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <ArticleCard article={hero} large />
          <div className="grid gap-5">{side.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
        </section>
      )}

      <div className="mb-8 flex gap-2 overflow-x-auto pb-1">
        <Link href="/mag" className="chip shrink-0 bg-brand-600 px-4 py-2 text-sm text-white ring-brand-600">همه مقالات</Link>
        {cats.filter((c) => c.article_count > 0).map((c) => (
          <Link key={c.slug} href={`/mag/category/${c.slug}`} className="chip shrink-0 bg-white px-4 py-2 text-sm text-slate-700 ring-line hover:text-brand-700">
            {c.name} ({num(c.article_count)})
          </Link>
        ))}
      </div>

      <h2 className="mb-5 text-xl font-black">{sp.q ? `نتایج جستجوی «${sp.q}»` : "تازه‌ترین مقالات"}</h2>
      {latest.results.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{latest.results.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
      ) : (
        <Empty title="مقاله‌ای یافت نشد" />
      )}
      <Pagination page={page} count={latest.count} pageSize={12} makeHref={(p) => `/mag?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`} />
    </div>
  );
}
