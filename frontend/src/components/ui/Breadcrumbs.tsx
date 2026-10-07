import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { SITE_URL } from "@/lib/config";
import JsonLd from "./JsonLd";

export type Crumb = { href?: string; label: string };

export default function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all = [{ href: "/", label: "خانه" }, ...items];
  return (
    <>
      <nav aria-label="breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-muted">
        {all.map((c, i) => (
          <span key={i} className="flex items-center gap-1">
            {c.href && i < all.length - 1 ? (
              <Link href={c.href} className="hover:text-brand-700">
                {c.label}
              </Link>
            ) : (
              <span className="text-slate-700">{c.label}</span>
            )}
            {i < all.length - 1 && <ChevronLeft className="size-3" />}
          </span>
        ))}
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: all.map((c, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: c.label,
            ...(c.href ? { item: `${SITE_URL}${c.href}` } : {}),
          })),
        }}
      />
    </>
  );
}
