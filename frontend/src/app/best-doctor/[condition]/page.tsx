import type { Metadata } from "next";
import { notFound } from "next/navigation";
import DoctorListPage from "@/components/doctors/DoctorListPage";
import { serverGetOrNull } from "@/lib/server-api";
import type { Condition } from "@/lib/types";

type P = { params: Promise<{ condition: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { condition } = await params;
  const c = await serverGetOrNull<Condition>(`/conditions/${condition}/`, 3600);
  return c ? { title: `بهترین پزشک ${c.name}`, description: `معرفی و نوبت‌دهی بهترین پزشکان برای ${c.name}`, alternates: { canonical: `/best-doctor/${condition}` } } : {};
}

export default async function Page({ params, searchParams }: P) {
  const { condition } = await params;
  const c = await serverGetOrNull<Condition>(`/conditions/${condition}/`, 3600);
  if (!c) notFound();
  const specs = c.specialties.map((s) => s.name).join("، ");
  return (
    <DoctorListPage
      condition={condition}
      searchParams={await searchParams}
      title={`بهترین پزشک برای ${c.name}`}
      intro={c.description || `برای ${c.name} می‌توانید به پزشکان این تخصص‌ها مراجعه کنید: ${specs}. لیست زیر بر اساس امتیاز بیماران و نوبت‌های موفق مرتب شده است.`}
      crumbs={[{ href: "/doctors", label: "پزشکان" }, { label: c.name }]}
      basePath={`/best-doctor/${condition}`}
    />
  );
}
