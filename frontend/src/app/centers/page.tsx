import type { Metadata } from "next";
import CenterListPage from "@/components/centers/CenterListPage";

export const metadata: Metadata = { title: "مراکز درمانی، بیمارستان‌ها و کلینیک‌ها" };

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <CenterListPage searchParams={await searchParams} title="مراکز درمانی" crumbs={[{ label: "مراکز درمانی" }]} basePath="/centers" />;
}
