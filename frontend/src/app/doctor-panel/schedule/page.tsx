"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import { PageTitle } from "@/components/panel/PanelShell";
import ScheduleEditor from "@/components/panel/ScheduleEditor";
import Empty from "@/components/ui/Empty";
import { get } from "@/lib/api";

type Office = { id: number; title: string; city_name: string };

export default function Page() {
  const offices = useQuery({ queryKey: ["dp-offices"], queryFn: () => get<Office[]>("/doctor-panel/offices/") });
  const [office, setOffice] = useState<number | null>(null);
  const current = office ?? offices.data?.[0]?.id ?? null;
  return (
    <>
      <PageTitle>برنامه کاری</PageTitle>
      {offices.data && !offices.data.length ? (
        <Empty title="ابتدا یک مطب ثبت کنید"><Link href="/doctor-panel/offices" className="text-brand-700">افزودن مطب</Link></Empty>
      ) : (
        <>
          {offices.data && offices.data.length > 1 && (
            <select className="input mb-4 w-auto" value={current ?? ""} onChange={(e) => setOffice(Number(e.target.value))}>
              {offices.data.map((o) => <option key={o.id} value={o.id}>{o.title} - {o.city_name}</option>)}
            </select>
          )}
          {current && <ScheduleEditor base="/doctor-panel" office={current} />}
        </>
      )}
    </>
  );
}
