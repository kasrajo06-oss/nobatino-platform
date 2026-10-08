import type { Metadata } from "next";
import DoctorListPage from "@/components/doctors/DoctorListPage";

export const metadata: Metadata = {
  title: "مشاوره آنلاین با پزشک؛ تلفنی، متنی و ویدیویی",
  description: "مشاوره پزشکی آنلاین با پزشکان متخصص به‌صورت تلفنی، متنی و ویدیویی، حتی همین حالا.",
  alternates: { canonical: "/doctors/telehealth" },
};

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return (
    <DoctorListPage
      telehealth
      searchParams={sp}
      title="مشاوره آنلاین با پزشک"
      intro="سؤال خود را از بهترین پزشکان بپرسید: مشاوره متنی با ارسال عکس و مدارک، تماس صوتی یا تصویری امن در مرورگر، یا مشاوره فوری با پزشکان آنلاین."
      crumbs={[{ href: "/doctors", label: "پزشکان" }, { label: "مشاوره آنلاین" }]}
      basePath="/doctors/telehealth"
    />
  );
}
