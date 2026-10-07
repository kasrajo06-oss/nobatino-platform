import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoctorListPage from "@/components/doctors/DoctorListPage";
import { serverGetOrNull } from "@/lib/server-api";
import type { City } from "@/lib/types";

type P = { params: Promise<{ city: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { city } = await params;
  const c = await serverGetOrNull<City>(`/cities/${city}/`, 3600);
  return c ? { title: `نوبت‌دهی پزشکان ${c.name}`, description: `رزرو آنلاین نوبت بهترین پزشکان ${c.name}`, alternates: { canonical: `/doctors/city/${city}` } } : {};
}

export default async function Page({ params, searchParams }: P) {
  const { city } = await params;
  const c = await serverGetOrNull<City>(`/cities/${city}/`, 3600);
  if (!c) notFound();
  return (
    <DoctorListPage
      city={city}
      searchParams={await searchParams}
      title={`نوبت‌دهی اینترنتی پزشکان ${c.name}`}
      crumbs={[{ href: "/doctors", label: "پزشکان" }, { label: c.name }]}
      basePath={`/doctors/city/${city}`}
    />
  );
}
