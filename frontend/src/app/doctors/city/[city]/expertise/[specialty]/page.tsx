import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoctorListPage from "@/components/doctors/DoctorListPage";
import { serverGetOrNull } from "@/lib/server-api";
import type { City, Specialty } from "@/lib/types";

type P = { params: Promise<{ city: string; specialty: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

async function load(city: string, specialty: string) {
  return Promise.all([serverGetOrNull<City>(`/cities/${city}/`, 3600), serverGetOrNull<Specialty>(`/specialties/${specialty}/`, 3600)]);
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { city, specialty } = await params;
  const [c, s] = await load(city, specialty);
  return c && s ? { title: `بهترین ${s.title} در ${c.name}`, alternates: { canonical: `/doctors/city/${city}/expertise/${specialty}` } } : {};
}

export default async function Page({ params, searchParams }: P) {
  const { city, specialty } = await params;
  const [c, s] = await load(city, specialty);
  if (!c || !s) notFound();
  return (
    <DoctorListPage
      city={city}
      specialty={specialty}
      searchParams={await searchParams}
      title={`نوبت‌دهی ${s.title} در ${c.name}`}
      crumbs={[{ href: "/doctors", label: "پزشکان" }, { href: `/doctors/city/${city}`, label: c.name }, { label: s.name }]}
      basePath={`/doctors/city/${city}/expertise/${specialty}`}
    />
  );
}
