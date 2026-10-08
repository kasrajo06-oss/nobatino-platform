import Link from "next/link";
import Breadcrumbs, { type Crumb } from "@/components/ui/Breadcrumbs";
import Empty from "@/components/ui/Empty";
import Pagination from "@/components/ui/Pagination";
import { num } from "@/lib/format";
import { qs, serverGet } from "@/lib/server-api";
import type { CenterCard as Center, City, Paginated } from "@/lib/types";
import { CenterIcon } from "@/lib/icons";
import CenterCard from "./CenterCard";

export const CENTER_TYPES: Record<string, string> = {
  hospital: "بیمارستان‌ها",
  clinic: "کلینیک‌ها",
  darmangah: "درمانگاه‌ها",
  laboratory: "آزمایشگاه‌ها",
  imaging: "مراکز تصویربرداری",
  pharmacy: "داروخانه‌ها",
};

const PAGE_SIZE = 18;

export default async function CenterListPage({
  type,
  searchParams,
  title,
  crumbs,
  basePath,
}: {
  type?: string;
  searchParams: Record<string, string | string[] | undefined>;
  title: string;
  crumbs: Crumb[];
  basePath: string;
}) {
  const s = (k: string) => (typeof searchParams[k] === "string" ? (searchParams[k] as string) : undefined);
  const page = Math.max(1, Number(s("page") || 1));
  const filters = { city: s("city"), q: s("q"), online_reception: s("online_reception"), has_home_sampling: s("has_home_sampling"), is_24h: s("is_24h") };
  const [data, cities, stats] = await Promise.all([
    serverGet<Paginated<Center>>(`/centers/${qs({ ...filters, type, page, page_size: PAGE_SIZE })}`, { revalidate: 60 }),
    serverGet<City[]>("/cities/?is_popular=true", { revalidate: 3600 }),
    serverGet<{ type: string; label: string; count: number }[]>("/centers/stats/", { revalidate: 600 }),
  ]);
  const href = (patch: Record<string, string | undefined>, path = basePath) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...filters, ...patch })) if (v) sp.set(k, v);
    return `${path}${sp.size ? `?${sp}` : ""}`;
  };

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={crumbs} />
      <h1 className="mt-3 mb-5 text-2xl font-extrabold">{title}</h1>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        <Link href={href({}, "/centers")} className={`chip shrink-0 px-3 py-2 ${!type ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line"}`}>همه مراکز</Link>
        {stats.map((st) => (
          <Link key={st.type} href={href({}, `/centers/type/${st.type}`)} className={`chip shrink-0 px-4 py-2.5 text-sm ${type === st.type ? "bg-brand-600 text-white ring-brand-600" : "bg-white text-slate-700 ring-line"}`}>
            <CenterIcon type={st.type} className="size-5" /> {CENTER_TYPES[st.type]} ({num(st.count)})
          </Link>
        ))}
      </div>
      <form className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_200px_auto_auto]" action={basePath}>
        <input name="q" defaultValue={filters.q} placeholder="نام مرکز..." className="input" />
        <select name="city" defaultValue={filters.city} className="input">
          <option value="">همه شهرها</option>
          {cities.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="online_reception" value="true" defaultChecked={filters.online_reception === "true"} className="accent-brand-600" /> پذیرش آنلاین</label>
        <button className="btn-primary">اعمال</button>
      </form>
      <p className="mb-3 text-sm text-muted">{num(data.count)} مرکز</p>
      {data.results.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.results.map((c) => <CenterCard key={c.id} center={c} />)}
        </div>
      ) : (
        <Empty title="مرکزی یافت نشد" />
      )}
      <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} makeHref={(p) => href({ page: p > 1 ? String(p) : undefined })} />
    </div>
  );
}
