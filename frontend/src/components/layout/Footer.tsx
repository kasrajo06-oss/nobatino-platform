import { Headset, Mail, MapPin, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { BRAND, SUPPORT_PHONE } from "@/lib/config";
import Logo from "./Logo";

const COLS = [
  {
    title: "خدمات",
    links: [
      ["/doctors", "نوبت‌دهی مطب پزشکان"],
      ["/doctors/telehealth", "مشاوره آنلاین"],
      ["/centers/type/laboratory", "پذیرش آنلاین آزمایشگاه"],
      ["/centers", "مراکز درمانی"],
      ["/specialties", "همه تخصص‌ها"],
    ],
  },
  {
    title: BRAND,
    links: [
      ["/pages/about", "درباره ما"],
      ["/faq", "سؤالات متداول"],
      ["/pages/terms", "قوانین و مقررات"],
      ["/pages/privacy", "حریم خصوصی"],
      ["/pages/contact", "تماس با ما"],
    ],
  },
  {
    title: "همکاری با ما",
    links: [
      ["/join/doctor", "ثبت‌نام پزشکان"],
      ["/join/center", "ثبت‌نام مراکز درمانی"],
      ["/doctor-panel", "ورود به پنل پزشک"],
      ["/credits", "منابع تصاویر"],
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-10 bg-slate-950 text-slate-300">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="space-y-5">
          <div className="[&_span:last-child]:text-white">
            <Logo />
          </div>
          <p className="text-sm leading-8 text-slate-400">
            نوبت‌دهی اینترنتی پزشکان، مشاوره آنلاین و پذیرش آزمایشگاه در سراسر کشور؛ سریع، شفاف و بدون صف.
          </p>
          <div className="space-y-2 text-sm">
            <p className="flex items-center gap-2"><Headset className="size-4 text-brand-400" /> پشتیبانی: <span className="ltr font-semibold text-white">{SUPPORT_PHONE}</span></p>
            <p className="flex items-center gap-2"><Mail className="size-4 text-brand-400" /> support@example.ir</p>
            <p className="flex items-center gap-2"><MapPin className="size-4 text-brand-400" /> تهران</p>
          </div>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h3 className="mb-4 font-bold text-white">{col.title}</h3>
            <ul className="space-y-3 text-sm">
              {col.links.map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-slate-400 transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/10">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-5 text-xs text-slate-500 sm:flex-row">
          <span>© {new Date().getFullYear()} {BRAND} — تمامی حقوق محفوظ است.</span>
          <span className="flex items-center gap-1.5"><ShieldCheck className="size-4" /> اطلاعات پزشکی شما محرمانه و رمزنگاری‌شده است</span>
        </div>
      </div>
    </footer>
  );
}
