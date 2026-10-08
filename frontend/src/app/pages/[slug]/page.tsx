import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import Markdown from "@/components/ui/Markdown";
import { serverGetOrNull } from "@/lib/server-api";

type PageData = { slug: string; title: string; body: string; updated_at: string };
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const page = await serverGetOrNull<PageData>(`/pages/${(await params).slug}/`, 3600);
  return page ? { title: page.title } : {};
}

export default async function StaticPage({ params }: P) {
  const page = await serverGetOrNull<PageData>(`/pages/${(await params).slug}/`, 3600);
  if (!page) notFound();
  return (
    <div className="container-page max-w-3xl py-6">
      <Breadcrumbs items={[{ label: page.title }]} />
      <article className="card mt-4 space-y-4 p-6 text-sm leading-8 text-slate-700">
        <h1 className="text-2xl font-extrabold text-slate-900">{page.title}</h1>
        <Markdown source={page.body} />
      </article>
    </div>
  );
}
