import { Suspense } from "react";
import Breadcrumbs, { type Crumb } from "@/components/ui/Breadcrumbs";
import Empty from "@/components/ui/Empty";
import Pagination from "@/components/ui/Pagination";
import { num } from "@/lib/format";
import { qs, serverGet } from "@/lib/server-api";
import type { City, DoctorCard as Doctor, Insurance, Paginated, Specialty } from "@/lib/types";
import DoctorCard from "./DoctorCard";
import DoctorFilters, { SortBar } from "./DoctorFilters";

export type ListParams = {
  city?: string;
  specialty?: string;
  condition?: string;
  searchParams: Record<string, string | string[] | undefined>;
  title: string;
  intro?: string;
  crumbs: Crumb[];
  basePath: string;
};

const PAGE_SIZE = 20;
const ALLOWED = ["q", "gender", "insurance", "appointment_type", "has_free_slot", "instant", "ordering", "page"];

export default async function DoctorListPage(p: ListParams) {
  const sp: Record<string, string> = {};
  for (const k of ALLOWED) {
    const v = p.searchParams[k];
    if (typeof v === "string" && v) sp[k] = v;
  }
  const page = Math.max(1, Number(sp.page || 1));
  const city = p.city || (typeof p.searchParams.city === "string" ? p.searchParams.city : undefined);
  const [data, cities, specialties, insurances] = await Promise.all([
    serverGet<Paginated<Doctor>>(
      `/doctors/${qs({ ...sp, city, specialty: p.specialty, condition: p.condition, page, page_size: PAGE_SIZE })}`,
      { revalidate: 30 },
    ),
    serverGet<City[]>("/cities/?is_popular=true", { revalidate: 3600 }),
    serverGet<Specialty[]>("/specialties/", { revalidate: 3600 }),
    serverGet<Insurance[]>("/insurances/", { revalidate: 3600 }),
  ]);
  const extra = new URLSearchParams(sp);
  const makeHref = (n: number) => {
    const s = new URLSearchParams(extra);
    if (n > 1) s.set("page", String(n));
    else s.delete("page");
    return `${p.basePath}${s.size ? `?${s}` : ""}`;
  };

  return (
    <div className="container-page py-6">
      <Breadcrumbs items={p.crumbs} />
      <div className="mt-3 mb-5">
        <h1 className="text-2xl font-extrabold text-slate-900">{p.title}</h1>
        {p.intro && <p className="mt-2 max-w-3xl text-sm leading-7 text-muted">{p.intro}</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Suspense>
          <DoctorFilters specialties={specialties} cities={cities} insurances={insurances} lockCity={city} lockSpecialty={p.specialty} />
        </Suspense>
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">{num(data.count)} پزشک یافت شد</p>
            <Suspense>
              <SortBar />
            </Suspense>
          </div>
          {data.results.length ? (
            data.results.map((d) => <DoctorCard key={d.id} doctor={d} />)
          ) : (
            <Empty title="پزشکی با این مشخصات پیدا نشد">فیلترها را تغییر دهید یا شهر دیگری را انتخاب کنید.</Empty>
          )}
          <Pagination page={page} count={data.count} pageSize={PAGE_SIZE} makeHref={makeHref} />
        </section>
      </div>
    </div>
  );
}
