import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { faDate, num } from "@/lib/format";
import { categoryTone, type ArticleCard as Article } from "@/lib/magazine";

export function ArticleCover({ article, className = "" }: { article: Article; className?: string }) {
  return article.cover ? (
    <img src={article.cover} alt="" loading="lazy" className={`object-cover ${className}`} />
  ) : (
    <div className={`grid place-items-center bg-gradient-to-br ${categoryTone(article.category)} text-white ${className}`}>
      <BookOpen className="size-12 opacity-80" />
    </div>
  );
}

export default function ArticleCard({ article: a, large = false }: { article: Article; large?: boolean }) {
  return (
    <Link href={`/mag/${a.slug}`} className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-line transition hover:-translate-y-1 hover:shadow-xl">
      <div className={`relative overflow-hidden ${large ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        <ArticleCover article={a} className="absolute inset-0 size-full transition duration-500 group-hover:scale-105" />
        <span className="absolute top-4 right-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-800 backdrop-blur">{a.category.name}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className={`font-extrabold leading-8 text-slate-900 group-hover:text-brand-700 ${large ? "text-xl" : "text-base"}`}>{a.title}</h3>
        <p className="mt-2 line-clamp-2 flex-1 text-sm leading-7 text-muted">{a.excerpt}</p>
        <div className="mt-4 flex items-center gap-3 text-xs text-muted">
          <span>{faDate(a.published_at)}</span>
          <span className="flex items-center gap-1"><Clock className="size-3.5" /> {num(a.reading_minutes)} دقیقه مطالعه</span>
        </div>
      </div>
    </Link>
  );
}
