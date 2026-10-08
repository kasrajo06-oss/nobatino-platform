"use client";

import Link from "next/link";
import ConsultList from "@/components/panel/ConsultList";
import { PageTitle } from "@/components/panel/PanelShell";

export default function Page() {
  return (
    <>
      <PageTitle action={<Link href="/doctors/telehealth" className="btn-primary py-2">مشاوره جدید</Link>}>مشاوره‌های آنلاین من</PageTitle>
      <ConsultList endpoint="/me/consultations/" />
    </>
  );
}
