import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumbs from "@/components/ui/Breadcrumbs";
import { serverGet } from "@/lib/server-api";
import type { Specialty } from "@/lib/types";

export const metadata: Metadata = { title: "همه تخصص‌های پزشکی" };
// Rendered per request (data is still cached per fetch) so builds don't need a running API.
export const dynamic = "force-dynamic";

export default async function Page() {
  const specialties = await serverGet<Specialty[]>("/specialties/", { revalidate: 3600 });
  return (
    <div className="container-page py-6">
      <Breadcrumbs items={[{ label: "تخصص‌ها" }]} />
      <h1 className="mt-3 mb-6 text-2xl font-extrabold">تخصص‌ها و فوق تخصص‌ها</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {specialties.map((s) => (
          <div key={s.id} className="card p-4">
            <Link href={`/doctors/expertise/${s.slug}`} className="font-bold text-slate-900 hover:text-brand-700">
              {s.name}
            </Link>
            {s.children.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {s.children.map((c) => (
                  <li key={c.id}>
                    <Link href={`/doctors/expertise/${c.slug}`} className="chip bg-slate-50 text-slate-600 ring-line hover:text-brand-700">
                      {c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
