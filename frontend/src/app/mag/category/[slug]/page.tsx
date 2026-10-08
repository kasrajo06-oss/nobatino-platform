import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArticleCard from "@/components/magazine/ArticleCard";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Empty from "@/components/ui/Empty";
import Pagination from "@/components/ui/Pagination";
import type { ArticleCard as Article, MagCategory } from "@/lib/magazine";
import { serverGet, serverGetOrNull } from "@/lib/server-api";
import type { Paginated } from "@/lib/types";

type P = { params: Promise<{ slug: string }>; searchParams: Promise<{ page?: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const c = await serverGetOrNull<MagCategory>(`/magazine/categories/${(await params).slug}/`, 300);
  return c ? { title: `${c.name} | مجله سلامت`, description: c.description } : {};
}

export default async function CategoryPage({ params, searchParams }: P) {
  const { slug } = await params;
  const page = Math.max(1, Number((await searchParams).page || 1));
  const cat = await serverGetOrNull<MagCategory>(`/magazine/categories/${slug}/`, 300);
  if (!cat) notFound();
  const list = await serverGet<Paginated<Article>>(`/magazine/articles/?category=${slug}&page=${page}&page_size=12`, { revalidate: 120 });
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ href: "/mag", label: "مجله سلامت" }, { label: cat.name }]} />
      <div className="mt-4 mb-10 rounded-3xl bg-gradient-to-l from-brand-50 to-white px-6 py-10 ring-1 ring-line md:px-10">
        <h1 className="text-3xl font-black">{cat.name}</h1>
        {cat.description && <p className="mt-2 text-muted">{cat.description}</p>}
      </div>
      {list.results.length ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{list.results.map((a) => <ArticleCard key={a.id} article={a} />)}</div>
      ) : (
        <Empty title="هنوز مقاله‌ای در این دسته منتشر نشده است" />
      )}
      <Pagination page={page} count={list.count} pageSize={12} makeHref={(p) => `/mag/category/${slug}${p > 1 ? `?page=${p}` : ""}`} />
    </div>
  );
}
