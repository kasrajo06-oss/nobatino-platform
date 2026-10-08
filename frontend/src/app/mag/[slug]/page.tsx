import { BadgeCheck, CalendarDays, Clock, Eye } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import DoctorCard from "@/components/doctors/DoctorCard";
import ArticleCard, { ArticleCover } from "@/components/magazine/ArticleCard";
import Avatar from "@/components/ui/Avatar";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import JsonLd from "@/components/ui/JsonLd";
import Markdown, { headings } from "@/components/ui/Markdown";
import { BRAND, SITE_URL } from "@/lib/config";
import { faDate, num } from "@/lib/format";
import type { ArticleCard as Article, ArticleDetail } from "@/lib/magazine";
import { serverGet, serverGetOrNull } from "@/lib/server-api";
import type { DoctorCard as Doctor } from "@/lib/types";

type P = { params: Promise<{ slug: string }> };
const path = async (params: P["params"]) => encodeURIComponent(decodeURIComponent((await params).slug));

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const a = await serverGetOrNull<ArticleDetail>(`/magazine/articles/${await path(params)}/`, 300);
  if (!a) return {};
  return {
    title: a.seo_title || a.title,
    description: a.seo_description || a.excerpt,
    alternates: { canonical: `/mag/${a.slug}` },
    openGraph: { type: "article", title: a.title, description: a.excerpt, ...(a.cover ? { images: [a.cover] } : {}) },
  };
}

export default async function ArticlePage({ params }: P) {
  const slug = await path(params);
  const a = await serverGetOrNull<ArticleDetail>(`/magazine/articles/${slug}/`, 60);
  if (!a) notFound();
  const related = await serverGet<{ articles: Article[]; doctors: Doctor[] }>(`/magazine/articles/${slug}/related/`, { revalidate: 300 });
  const toc = headings(a.body);

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ href: "/mag", label: "مجله سلامت" }, { href: `/mag/category/${a.category.slug}`, label: a.category.name }, { label: a.title }]} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "MedicalWebPage",
          headline: a.title,
          description: a.excerpt,
          datePublished: a.published_at,
          dateModified: a.updated_at,
          url: `${SITE_URL}/mag/${a.slug}`,
          publisher: { "@type": "Organization", name: BRAND },
          ...(a.reviewed_by ? { reviewedBy: { "@type": "Physician", name: a.reviewed_by.full_name, medicalSpecialty: a.reviewed_by.specialty } } : {}),
          ...(a.cover ? { image: a.cover } : {}),
        }}
      />
      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0">
          <Link href={`/mag/category/${a.category.slug}`} className="chip bg-brand-50 px-3 py-1.5 text-brand-700 ring-brand-100">{a.category.name}</Link>
          <h1 className="mt-4 text-3xl font-black leading-[1.5] text-slate-900 md:text-4xl">{a.title}</h1>
          <p className="mt-4 text-lg leading-9 text-slate-600">{a.excerpt}</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
            {a.author && <span>نویسنده: <b className="text-slate-700">{a.author}</b></span>}
            <span className="flex items-center gap-1"><CalendarDays className="size-4" /> {faDate(a.published_at)}</span>
            <span className="flex items-center gap-1"><Clock className="size-4" /> {num(a.reading_minutes)} دقیقه</span>
            <span className="flex items-center gap-1"><Eye className="size-4" /> {num(a.views)} بازدید</span>
          </div>
          {a.reviewed_by && (
            <Link href={`/doctor/${a.reviewed_by.slug}/${a.reviewed_by.short_id}`} className="mt-6 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-100">
              <Avatar src={a.reviewed_by.photo} name={a.reviewed_by.full_name} gender={a.reviewed_by.gender} size={48} />
              <span className="text-sm">
                <span className="flex items-center gap-1 text-emerald-700"><BadgeCheck className="size-4" /> بازبینی علمی</span>
                <b className="text-slate-900">{a.reviewed_by.full_name}</b> <span className="text-muted">— {a.reviewed_by.specialty}</span>
              </span>
            </Link>
          )}
          <div className="relative mt-8 aspect-[16/8] overflow-hidden rounded-3xl">
            <ArticleCover article={a} className="absolute inset-0 size-full" />
          </div>
          <Markdown source={a.body} className="mt-10 text-[17px]" />
          <p className="mt-10 rounded-2xl bg-slate-50 p-4 text-xs leading-6 text-muted">
            مطالب این مجله برای افزایش آگاهی است و جایگزین معاینه و تشخیص پزشک نیست. در صورت بروز علائم با پزشک مشورت کنید.
          </p>
          {(a.specialties.length > 0 || a.conditions.length > 0) && (
            <div className="mt-6 flex flex-wrap gap-2">
              {a.specialties.map((s) => <Link key={s.slug} href={`/doctors/expertise/${s.slug}`} className="chip bg-white px-3 py-1.5 text-slate-700 ring-line hover:text-brand-700">پزشکان {s.name}</Link>)}
              {a.conditions.map((c) => <Link key={c.slug} href={`/best-doctor/${c.slug}`} className="chip bg-white px-3 py-1.5 text-slate-700 ring-line hover:text-brand-700">بهترین پزشک {c.name}</Link>)}
            </div>
          )}
        </article>

        <aside className="space-y-6">
          {toc.length > 1 && (
            <nav className="card sticky top-24 hidden p-5 lg:block" aria-label="فهرست مطالب">
              <p className="mb-3 text-sm font-bold text-slate-500">فهرست مطالب</p>
              <ol className="space-y-2 text-sm">
                {toc.map((h) => <li key={h.id}><a href={`#${h.id}`} className="text-slate-700 hover:text-brand-700">{h.text}</a></li>)}
              </ol>
            </nav>
          )}
        </aside>
      </div>

      {related.doctors.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-black">نوبت از پزشکان مرتبط</h2>
          <div className="grid gap-5 md:grid-cols-2">{related.doctors.map((d) => <DoctorCard key={d.id} doctor={d} />)}</div>
        </section>
      )}
      {related.articles.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-5 text-xl font-black">مقالات مرتبط</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">{related.articles.map((r) => <ArticleCard key={r.id} article={r} />)}</div>
        </section>
      )}
    </div>
  );
}
