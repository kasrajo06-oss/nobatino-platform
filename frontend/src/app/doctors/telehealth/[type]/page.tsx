import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoctorListPage from "@/components/doctors/DoctorListPage";
import { KIND_META, type ConsultKind } from "@/lib/consult";

type P = { params: Promise<{ type: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const meta = KIND_META[(await params).type as ConsultKind];
  return meta ? { title: `${meta.label} با پزشک`, alternates: { canonical: `/doctors/telehealth/${(await params).type}` } } : {};
}

export default async function Page({ params, searchParams }: P) {
  const { type } = await params;
  const meta = KIND_META[type as ConsultKind];
  if (!meta) notFound();
  return (
    <DoctorListPage
      telehealth
      appointmentType={type}
      searchParams={await searchParams}
      title={`${meta.label} با پزشک`}
      intro={meta.desc}
      crumbs={[{ href: "/doctors", label: "پزشکان" }, { href: "/doctors/telehealth", label: "مشاوره آنلاین" }, { label: meta.label }]}
      basePath={`/doctors/telehealth/${type}`}
    />
  );
}
