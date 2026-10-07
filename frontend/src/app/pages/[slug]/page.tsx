import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { serverGetOrNull } from "@/lib/server-api";

type PageData = { slug: string; title: string; body: string; updated_at: string };
type P = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const page = await serverGetOrNull<PageData>(`/pages/${(await params).slug}/`, 3600);
  return page ? { title: page.title } : {};
}

/** Minimal, safe Markdown: headings, bullet lists and paragraphs (no raw HTML). */
function renderMarkdown(md: string) {
  return md.split(/\n{2,}/).map((block, i) => {
    if (block.startsWith("## ")) return <h2 key={i} className="mt-6 text-lg font-bold">{block.slice(3)}</h2>;
    if (block.split("\n").every((l) => l.startsWith("- ")))
      return <ul key={i} className="list-disc space-y-1 ps-5">{block.split("\n").map((l, j) => <li key={j}>{l.slice(2)}</li>)}</ul>;
    return <p key={i}>{block}</p>;
  });
}

export default async function StaticPage({ params }: P) {
  const page = await serverGetOrNull<PageData>(`/pages/${(await params).slug}/`, 3600);
  if (!page) notFound();
  return (
    <div className="container-page max-w-3xl py-6">
      <Breadcrumbs items={[{ label: page.title }]} />
      <article className="card mt-4 space-y-4 p-6 text-sm leading-8 text-slate-700">
        <h1 className="text-2xl font-extrabold text-slate-900">{page.title}</h1>
        {renderMarkdown(page.body)}
      </article>
    </div>
  );
}
