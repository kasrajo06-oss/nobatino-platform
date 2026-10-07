import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoctorListPage from "@/components/doctors/DoctorListPage";
import { serverGetOrNull } from "@/lib/server-api";
import type { Specialty } from "@/lib/types";

type P = { params: Promise<{ specialty: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { specialty } = await params;
  const s = await serverGetOrNull<Specialty>(`/specialties/${specialty}/`, 3600);
  return s ? { title: `بهترین ${s.title}`, description: `لیست ${s.title} با امکان رزرو آنلاین نوبت`, alternates: { canonical: `/doctors/expertise/${specialty}` } } : {};
}

export default async function Page({ params, searchParams }: P) {
  const { specialty } = await params;
  const s = await serverGetOrNull<Specialty>(`/specialties/${specialty}/`, 3600);
  if (!s) notFound();
  return (
    <DoctorListPage
      specialty={specialty}
      searchParams={await searchParams}
      title={`نوبت‌دهی ${s.title}`}
      intro={s.description}
      crumbs={[{ href: "/doctors", label: "پزشکان" }, { label: s.name }]}
      basePath={`/doctors/expertise/${specialty}`}
    />
  );
}
