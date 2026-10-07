"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import BarChart from "@/components/panel/BarChart";
import { PageTitle, StatCard } from "@/components/panel/PanelShell";
import { get } from "@/lib/api";
import { faShort, num, toman } from "@/lib/format";

type Dash = {
  users: number; new_users_today: number; doctors_approved: number; doctors_pending: number; centers_pending: number;
  reviews_pending: number; settlements_pending: number; appointments_today: number; revenue_30d: number;
  series: { date: string; appointments: number; revenue: number }[];
};

export default function OpsDashboard() {
  const { data } = useQuery({ queryKey: ["ops-dash"], queryFn: () => get<Dash>("/ops/dashboard/") });
  if (!data) return null;
  return (
    <>
      <PageTitle>داشبورد عملیات</PageTitle>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="کاربران" value={num(data.users)} hint={`${num(data.new_users_today)} عضو جدید امروز`} />
        <StatCard label="پزشکان فعال" value={num(data.doctors_approved)} />
        <StatCard label="نوبت‌های امروز" value={num(data.appointments_today)} />
        <StatCard label="درآمد آنلاین ۳۰ روز" value={toman(data.revenue_30d)} />
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["/ops/verifications", "پزشک در انتظار تأیید", data.doctors_pending],
          ["/ops/verifications?tab=centers", "مرکز در انتظار تأیید", data.centers_pending],
          ["/ops/reviews", "نظر در انتظار بررسی", data.reviews_pending],
          ["/ops/settlements", "درخواست تسویه", data.settlements_pending],
        ].map(([href, label, n]) => (
          <Link key={href as string} href={href as string} className={`card p-4 transition hover:border-brand-300 ${Number(n) ? "border-amber-300 bg-amber-50" : ""}`}>
            <p className="text-xs text-muted">{label}</p>
            <p className="mt-1 text-2xl font-extrabold">{num(n as number)}</p>
          </Link>
        ))}
      </div>
      <div className="card mt-5 p-5">
        <h2 className="mb-6 font-bold">نوبت‌های ثبت‌شده در ۳۰ روز اخیر</h2>
        <BarChart data={data.series.map((s) => ({ label: faShort(`${s.date}T12:00:00`), value: s.appointments }))} />
      </div>
    </>
  );
}
