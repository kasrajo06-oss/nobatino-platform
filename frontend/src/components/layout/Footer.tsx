import Link from "next/link";
import { BRAND, SUPPORT_PHONE } from "@/lib/config";
import Logo from "./Logo";

const COLS = [
  {
    title: "خدمات",
    links: [
      ["/doctors", "نوبت‌دهی مطب پزشکان"],
      ["/centers", "مراکز درمانی"],
      ["/centers/type/laboratory", "پذیرش آنلاین آزمایشگاه"],
      ["/specialties", "همه تخصص‌ها"],
    ],
  },
  {
    title: `${BRAND}`,
    links: [
      ["/pages/about", "درباره ما"],
      ["/faq", "سؤالات متداول"],
      ["/pages/terms", "قوانین و مقررات"],
      ["/pages/privacy", "حریم خصوصی"],
      ["/pages/contact", "تماس با ما"],
    ],
  },
  {
    title: "همکاری",
    links: [
      ["/join/doctor", "ثبت‌نام پزشکان"],
      ["/join/center", "ثبت‌نام مراکز درمانی"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="space-y-3">
          <Logo />
          <p className="text-sm leading-7 text-muted">
            نوبت‌دهی اینترنتی پزشکان، مراکز درمانی و آزمایشگاه‌ها در سراسر کشور؛ سریع، شفاف و بدون صف.
          </p>
          <p className="text-sm text-slate-700">
            پشتیبانی: <span className="ltr font-semibold">{SUPPORT_PHONE}</span>
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-3 font-bold text-slate-800">{col.title}</h3>
            <ul className="space-y-2 text-sm">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-muted transition hover:text-brand-700">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-muted">
        © {new Date().getFullYear()} {BRAND} — تمامی حقوق محفوظ است.
      </div>
    </footer>
  );
}
