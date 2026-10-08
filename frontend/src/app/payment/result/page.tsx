import { CheckCircle2, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { faDigits } from "@/lib/format";
import { serverGet } from "@/lib/server-api";
import type { Appointment } from "@/lib/types";

export const metadata: Metadata = { title: "نتیجه پرداخت", robots: { index: false } };

export default async function PaymentResult({ searchParams }: { searchParams: Promise<{ status?: string; tracking_code?: string; package_order?: string }> }) {
  const { status, tracking_code, package_order } = await searchParams;
  const ok = status === "success";
  const appt = ok && tracking_code ? await serverGet<Appointment>(`/me/appointments/${tracking_code}/`, { auth: true }).catch(() => null) : null;
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-10">
      <div className="card w-full max-w-md space-y-4 p-8 text-center">
        {ok ? <CheckCircle2 className="mx-auto size-16 text-emerald-500" /> : <XCircle className="mx-auto size-16 text-rose-500" />}
        <h1 className="text-xl font-extrabold">{ok ? "پرداخت موفق بود" : "پرداخت ناموفق بود"}</h1>
        {ok && tracking_code && (
          <p className="text-sm text-slate-600">
            نوبت شما قطعی شد. کد پیگیری: <b className="text-lg tracking-widest">{faDigits(tracking_code)}</b>
          </p>
        )}
        {!ok && <p className="text-sm text-muted">در صورت کسر وجه، مبلغ حداکثر تا ۷۲ ساعت به حساب شما برمی‌گردد یا به کیف پول واریز می‌شود.</p>}
        <div className="flex gap-2">
          {package_order ? (
            <Link href={`/orders/${package_order}`} className="btn-primary flex-1">{ok ? "مشاهده کد استفاده" : "تلاش مجدد"}</Link>
          ) : appt?.is_online ? (
            <Link href={`/consult/${tracking_code}`} className="btn-primary flex-1">ورود به اتاق مشاوره</Link>
          ) : (
            tracking_code && <Link href={`/booking/${tracking_code}`} className="btn-primary flex-1">{ok ? "مشاهده نوبت" : "تلاش مجدد"}</Link>
          )}
          <Link href="/panel/appointments" className="btn-outline flex-1">نوبت‌های من</Link>
        </div>
      </div>
    </div>
  );
}
