/** Visible on staging servers so nobody mistakes the test site for the real service. */
export default function StagingBanner() {
  if (process.env.NEXT_PUBLIC_STAGING !== "true") return null;
  return (
    <div className="bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
      نسخه آزمایشی — پرداخت‌ها واقعی نیستند و کد ورود روی صفحه نمایش داده می‌شود.
    </div>
  );
}
