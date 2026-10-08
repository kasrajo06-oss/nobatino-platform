import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";
import { serverGet } from "@/lib/server-api";
import type { ArticleCard } from "@/lib/magazine";
import type { Offer } from "@/lib/offers";
import type { CenterCard, City, Condition, DoctorCard, Paginated, Specialty } from "@/lib/types";

// Rendered per request (data is still cached per fetch) so builds don't need a running API.
export const dynamic = "force-dynamic";

async function allPages<T>(path: string, max = 50): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= max; page++) {
    const data = await serverGet<Paginated<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&page_size=100`, { revalidate: 3600 });
    out.push(...data.results);
    if (!data.next) break;
  }
  return out;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, specialties, conditions, doctors, centers, articles, offers] = await Promise.all([
    serverGet<City[]>("/cities/?is_popular=true", { revalidate: 3600 }),
    serverGet<Specialty[]>("/specialties/?all=1", { revalidate: 3600 }),
    serverGet<Condition[]>("/conditions/", { revalidate: 3600 }),
    allPages<DoctorCard>("/doctors/"),
    allPages<CenterCard>("/centers/"),
    allPages<ArticleCard>("/magazine/articles/"),
    allPages<Offer>("/offers/"),
  ]);
  const u = (path: string, priority = 0.6): MetadataRoute.Sitemap[number] => ({ url: `${SITE_URL}${path}`, changeFrequency: "daily", priority });
  return [
    u("/", 1),
    u("/doctors", 0.9),
    u("/centers", 0.8),
    u("/centers/type/laboratory", 0.8),
    ...cities.map((c) => u(`/doctors/city/${c.slug}`, 0.8)),
    ...specialties.map((s) => u(`/doctors/expertise/${s.slug}`, 0.8)),
    ...cities.flatMap((c) => specialties.filter((s) => !s.parent).map((s) => u(`/doctors/city/${c.slug}/expertise/${s.slug}`, 0.7))),
    ...conditions.map((c) => u(`/best-doctor/${c.slug}`, 0.7)),
    ...doctors.map((d) => u(`/doctor/${d.slug}/${d.short_id}`, 0.7)),
    ...centers.map((c) => u(`/center/${c.slug}`, 0.6)),
    u("/mag", 0.8),
    u("/offer", 0.8),
    u("/doctors/telehealth", 0.9),
    ...articles.map((a) => u(`/mag/${a.slug}`, 0.7)),
    ...offers.map((o) => u(`/offer/${o.slug}`, 0.6)),
  ];
}
