"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import BarChart from "@/components/panel/BarChart";
import { PageTitle, StatCard } from "@/components/panel/PanelShell";
import Alert from "@/components/ui/Alert";
import { get } from "@/lib/api";
import { faShort, num, relativeSlot, toman } from "@/lib/format";

type Dash = {
  today_total: number; today_attended: number; upcoming: number; month_revenue: number; rating_avg: string; review_count: number;
  first_free_slot_at: string | null; week: { date: string; count: number }[]; verification_status: string;
};

export default function DoctorDashboard() {
  const { data } = useQuery({ queryKey: ["doctor-dash"], queryFn: () => get<Dash>("/doctor-panel/dashboard/") });
  if (!data) return null;
  return (
    <>
      <PageTitle>داشبورد</PageTitle>
      {data.verification_status !== "approved" && (
        <div className="mb-4">
          <Alert tone="info">
            پروفایل شما هنوز در سایت نمایش داده نمی‌شود. <Link href="/doctor-panel/profile" className="font-bold underline">تکمیل مدارک و ارسال برای تأیید</Link>
          </Alert>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="نوبت‌های امروز" value={num(data.today_total)} hint={`${num(data.today_attended)} مراجعه ثبت شده`} />
        <StatCard label="نوبت‌های پیش رو" value={num(data.upcoming)} />
        <StatCard label="درآمد آنلاین این ماه" value={toman(data.month_revenue)} />
        <StatCard label="امتیاز" value={num(Number(data.rating_avg).toFixed(1))} hint={`${num(data.review_count)} نظر`} />
      </div>
      <div className="card mt-5 p-5">
        <h2 className="mb-6 font-bold">نوبت‌های ۷ روز آینده</h2>
        <BarChart data={data.week.map((w) => ({ label: faShort(`${w.date}T12:00:00`), value: w.count }))} />
        <div className="mt-2 flex justify-between text-[10px] text-muted">{data.week.map((w) => <span key={w.date}>{faShort(`${w.date}T12:00:00`).split(" ")[0]}</span>)}</div>
      </div>
      <p className="mt-4 text-sm text-muted">اولین نوبت آزاد شما: {data.first_free_slot_at ? relativeSlot(data.first_free_slot_at) : "ندارد — برنامه کاری را تنظیم کنید."}</p>
    </>
  );
}
