import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CenterListPage, { CENTER_TYPES } from "@/components/centers/CenterListPage";

type P = { params: Promise<{ type: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const { type } = await params;
  const label = CENTER_TYPES[type];
  return label ? { title: type === "laboratory" ? "پذیرش آنلاین آزمایشگاه" : label } : {};
}

export default async function Page({ params, searchParams }: P) {
  const { type } = await params;
  const label = CENTER_TYPES[type];
  if (!label) notFound();
  return (
    <CenterListPage
      type={type}
      searchParams={await searchParams}
      title={type === "laboratory" ? "آزمایشگاه آنلاین؛ پذیرش بدون صف" : label}
      crumbs={[{ href: "/centers", label: "مراکز درمانی" }, { label }]}
      basePath={`/centers/type/${type}`}
    />
  );
}
