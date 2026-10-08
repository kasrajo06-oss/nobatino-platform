import Link from "next/link";

export default function Section({
  title,
  subtitle,
  more,
  children,
  className = "",
  tone = "plain",
}: {
  title: string;
  subtitle?: string;
  more?: { href: string; label: string };
  children: React.ReactNode;
  className?: string;
  tone?: "plain" | "white" | "brand";
}) {
  const bg = tone === "white" ? "bg-white" : tone === "brand" ? "bg-brand-900 text-white" : "";
  return (
    <section className={`py-14 md:py-20 ${bg} ${className}`}>
      <div className="container-page">
        <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className={`text-2xl font-black md:text-3xl ${tone === "brand" ? "text-white" : "text-slate-900"}`}>{title}</h2>
            {subtitle && <p className={`mt-2 max-w-2xl text-sm leading-7 md:text-base ${tone === "brand" ? "text-brand-100" : "text-muted"}`}>{subtitle}</p>}
          </div>
          {more && (
            <Link href={more.href} className={`shrink-0 text-sm font-semibold ${tone === "brand" ? "text-brand-200 hover:text-white" : "text-brand-700 hover:text-brand-900"}`}>
              {more.label} ←
            </Link>
          )}
        </div>
        {children}
      </div>
    </section>
  );
}
