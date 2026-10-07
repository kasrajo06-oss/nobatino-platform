import type { Metadata } from "next";
import DoctorListPage from "@/components/doctors/DoctorListPage";

export const metadata: Metadata = { title: "نوبت‌دهی اینترنتی پزشکان", alternates: { canonical: "/doctors" } };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <DoctorListPage searchParams={sp} title="نوبت‌دهی اینترنتی پزشکان" crumbs={[{ label: "پزشکان" }]} basePath="/doctors" />;
}
