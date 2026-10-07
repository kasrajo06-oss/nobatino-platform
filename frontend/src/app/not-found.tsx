import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container-page grid min-h-[60vh] place-items-center py-10 text-center">
      <div className="space-y-4">
        <p className="text-6xl font-black text-brand-200">۴۰۴</p>
        <h1 className="text-xl font-bold">صفحه موردنظر پیدا نشد</h1>
        <Link href="/" className="btn-primary">بازگشت به صفحه اصلی</Link>
      </div>
    </div>
  );
}
