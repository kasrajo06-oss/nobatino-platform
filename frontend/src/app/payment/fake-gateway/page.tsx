import type { Metadata } from "next";
import { toman } from "@/lib/format";

export const metadata: Metadata = { title: "درگاه پرداخت آزمایشی", robots: { index: false } };

/** Development-only simulated bank page (PAYMENT_GATEWAY=fake). Sends the user back to the Django callback. */
export default async function FakeGateway({ searchParams }: { searchParams: Promise<{ authority?: string; amount?: string; callback?: string }> }) {
  const { authority = "", amount = "0", callback = "" } = await searchParams;
  const valid = callback.startsWith("/api/payments/callback/?pid=");
  const cb = (status: string) => `${callback}&Authority=${encodeURIComponent(authority)}&Status=${status}`;
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-10">
      <div className="card w-full max-w-sm space-y-4 p-6 text-center">
        <span className="chip mx-auto bg-amber-50 text-amber-700 ring-amber-200">محیط آزمایشی — پرداخت واقعی انجام نمی‌شود</span>
        <h1 className="text-xl font-bold">درگاه پرداخت</h1>
        <p className="text-2xl font-black text-brand-700">{toman(Number(amount))}</p>
        <p className="ltr text-xs text-muted">{authority}</p>
        {valid ? (
          <div className="flex gap-2">
            <a href={cb("OK")} className="btn-primary flex-1">پرداخت موفق</a>
            <a href={cb("NOK")} className="btn-danger flex-1">انصراف</a>
          </div>
        ) : (
          <p className="text-sm text-rose-600">آدرس بازگشت نامعتبر است.</p>
        )}
      </div>
    </div>
  );
}
