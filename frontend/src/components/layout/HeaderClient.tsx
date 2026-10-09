"use client";

import { BloodDrop, Home, Pregnant, TestTubes, Thyroid } from "healthicons-react/outline";
import { CalendarCheck, ChevronDown, LogIn, Menu, MessageSquareText, Phone, Sun, UserRound, Video, X, Zap } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CenterIcon, ConditionIcon, SpecialtyIcon } from "@/lib/icons";
import { num } from "@/lib/format";
import type { HomeData } from "@/lib/home";
import { useMe } from "@/lib/use-me";
import NotificationBell from "@/components/notifications/NotificationBell";
import NotificationWatcher from "@/components/notifications/NotificationWatcher";
import OfferIcon from "@/components/offers/OfferIcon";
import Logo from "./Logo";

const CLINIC_CATS = [
  ["dentistry", "دندانپزشکی"],
  ["beauty", "پوست و زیبایی"],
  ["psychology", "روانشناسی"],
  ["checkup", "چکاپ و آزمایش"],
  ["physio", "فیزیوتراپی"],
  ["nutrition", "تغذیه و لاغری"],
];

export function panelHome(role?: string) {
  if (role === "doctor") return "/doctor-panel";
  if (role === "center_staff") return "/center-panel";
  if (role === "operator" || role === "superadmin") return "/ops";
  return "/panel";
}

type MenuKey = "office" | "online" | "centers" | "lab" | "clinic" | "mag";

export const ONLINE_TYPES = [
  { href: "/doctors/telehealth/phone", title: "مشاوره تلفنی", text: "تماس صوتی امن با پزشک در زمان انتخابی", icon: Phone, tone: "bg-sky-50 text-sky-600" },
  { href: "/doctors/telehealth/text", title: "مشاوره متنی", text: "پرسش و پاسخ با ارسال عکس و مدارک", icon: MessageSquareText, tone: "bg-violet-50 text-violet-600" },
  { href: "/doctors/telehealth/video", title: "مشاوره ویدیویی", text: "ویزیت تصویری از هر جا", icon: Video, tone: "bg-rose-50 text-rose-600" },
  { href: "/doctors/telehealth?online_now=true", title: "مشاوره فوری", text: "پزشکان آنلاین همین حالا", icon: Zap, tone: "bg-amber-50 text-amber-600" },
];

const LAB_LINKS = [
  { icon: TestTubes, label: "چکاپ کامل" },
  { icon: BloodDrop, label: "قند و چربی خون" },
  { icon: Thyroid, label: "تیروئید" },
  { icon: Home, label: "نمونه‌گیری در منزل" },
  { icon: Pregnant, label: "تست بارداری" },
  { icon: Sun, label: "ویتامین D" },
];

export default function HeaderClient({ menu }: { menu: HomeData | null }) {
  const { data: me } = useMe();
  const pathname = usePathname();
  const [open, setOpen] = useState<MenuKey | null>(null);
  const [mobile, setMobile] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);

  const enter = (key: MenuKey) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(key), 90);
  };
  const leave = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(null), 160);
  };

  const popularSpecs = menu?.specialties.filter((s) => s.is_popular).slice(0, 12) ?? [];
  const onlineSpecs = [...(menu?.specialties ?? [])].sort((a, b) => b.online_count - a.online_count).slice(0, 8);
  const NAV: { key: MenuKey; href: string; label: string }[] = [
    { key: "office", href: "/doctors", label: "نوبت‌دهی مطب" },
    { key: "online", href: "/doctors/telehealth", label: "مشاوره آنلاین" },
    { key: "centers", href: "/centers", label: "مراکز درمانی" },
    { key: "lab", href: "/centers/type/laboratory", label: "آزمایشگاه آنلاین" },
    { key: "clinic", href: "/offer", label: "کلینیک" },
    { key: "mag", href: "/mag", label: "مجله سلامت" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/95 backdrop-blur" onMouseLeave={leave}>
      <div className="container-page flex h-[72px] items-center gap-8">
        <Logo />
        <nav className="hidden h-full items-stretch xl:flex" aria-label="منوی اصلی">
          {NAV.map((item) => (
            <div key={item.key} className="relative flex" onMouseEnter={() => (item.key === "mag" ? leave() : enter(item.key))}>
              <Link
                href={item.href}
                onFocus={() => setOpen(item.key)}
                aria-expanded={open === item.key}
                className={`flex items-center gap-1 border-b-2 px-3 text-[15px] font-semibold transition ${
                  open === item.key || pathname.startsWith(item.href) ? "border-brand-600 text-brand-700" : "border-transparent text-slate-700 hover:text-brand-700"
                }`}
              >
                {item.label}
                {item.key !== "mag" && <ChevronDown className={`size-4 transition ${open === item.key ? "rotate-180" : ""}`} />}
              </Link>
            </div>
          ))}
        </nav>
        <div className="ms-auto flex items-center gap-2">
          {me && <NotificationBell />}
          {me ? (
            <Link href={panelHome(me.role)} className="btn-outline py-2">
              <UserRound className="size-4" />
              <span className="max-w-32 truncate">{me.full_name || "حساب کاربری"}</span>
            </Link>
          ) : (
            <Link href={`/login?next=${encodeURIComponent(pathname)}`} className="btn-primary py-2.5">
              <LogIn className="size-4" />
              ورود / ثبت‌نام
            </Link>
          )}
          <Link href="/panel/appointments" className="btn-ghost hidden py-2 xl:inline-flex">
            <CalendarCheck className="size-4" />
            نوبت‌های من
          </Link>
          <button className="btn-ghost p-2 xl:hidden" onClick={() => setMobile((o) => !o)} aria-label="منو" aria-expanded={mobile}>
            {mobile ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* desktop mega menu */}
      {open && menu && (
        <div className="absolute inset-x-0 top-full hidden border-b border-line bg-white shadow-2xl shadow-slate-900/10 xl:block" onMouseEnter={() => enter(open)}>
          <div className="container-page py-8">
            {open === "office" && (
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-10">
                <MenuColumn title="تخصص‌های پرمراجعه" more={{ href: "/specialties", label: "همه تخصص‌ها" }}>
                  <div className="grid grid-cols-3 gap-1">
                    {popularSpecs.map((s) => (
                      <Link key={s.slug} href={`/doctors/expertise/${s.slug}`} className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-brand-50">
                        <span className="grid size-10 place-items-center rounded-xl bg-slate-50 text-brand-600 group-hover:bg-white">
                          <SpecialtyIcon slug={s.slug} className="size-6" />
                        </span>
                        <span className="min-w-0">
                          <b className="block truncate text-sm font-semibold text-slate-800">{s.name}</b>
                          <span className="text-xs text-muted">{num(s.doctor_count)} پزشک</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                </MenuColumn>
                <MenuColumn title="شهرها">
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {menu.cities.slice(0, 16).map((c) => (
                      <Link key={c.slug} href={`/doctors/city/${c.slug}`} className="rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                        پزشکان {c.name}
                      </Link>
                    ))}
                  </div>
                </MenuColumn>
                <MenuColumn title="بیماری‌ها و خدمات">
                  <div className="flex flex-col gap-1">
                    {menu.conditions.filter((c) => c.is_popular).slice(0, 10).map((c) => (
                      <Link key={c.slug} href={`/best-doctor/${c.slug}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                        <ConditionIcon slug={c.slug} className="size-5 text-amber-600" /> {c.name}
                      </Link>
                    ))}
                  </div>
                </MenuColumn>
              </div>
            )}
            {open === "online" && (
              <div className="grid grid-cols-[1.3fr_1fr] gap-10">
                <MenuColumn title="انواع مشاوره آنلاین">
                  <div className="grid grid-cols-2 gap-3">
                    {ONLINE_TYPES.map((t) => (
                      <Link key={t.href} href={t.href} className="flex items-start gap-3 rounded-2xl border border-line p-4 transition hover:border-brand-300 hover:bg-brand-50/50">
                        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${t.tone}`}><t.icon className="size-5" /></span>
                        <span>
                          <b className="block text-slate-800">{t.title}</b>
                          <span className="text-xs leading-6 text-muted">{t.text}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  {menu.online_now > 0 && (
                    <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700">
                      <span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" /><span className="relative inline-flex size-2.5 rounded-full bg-emerald-500" /></span>
                      {num(menu.online_now)} پزشک همین حالا آنلاین هستند
                    </p>
                  )}
                </MenuColumn>
                <MenuColumn title="مشاوره آنلاین بر اساس تخصص">
                  <div className="grid grid-cols-2 gap-1">
                    {onlineSpecs.map((s) => (
                      <Link key={s.slug} href={`/doctors/telehealth?specialty=${s.slug}`} className="flex items-center gap-2 rounded-xl p-2 text-sm hover:bg-brand-50">
                        <SpecialtyIcon slug={s.slug} className="size-6 text-brand-600" />
                        <span className="text-slate-700">{s.name}</span>
                        <span className="ms-auto text-xs text-muted">{num(s.online_count)}+</span>
                      </Link>
                    ))}
                  </div>
                </MenuColumn>
              </div>
            )}
            {open === "centers" && (
              <MenuColumn title="انواع مراکز درمانی">
                <div className="grid grid-cols-6 gap-4">
                  {menu.center_types.map((t) => (
                    <Link key={t.type} href={`/centers/type/${t.type}`} className="group flex flex-col items-center gap-3 rounded-2xl border border-line p-5 text-center transition hover:border-brand-300 hover:shadow-md">
                      <span className="grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-600 group-hover:text-white">
                        <CenterIcon type={t.type} className="size-8" />
                      </span>
                      <b className="text-sm text-slate-800">{t.label}</b>
                      <span className="text-xs text-muted">{num(t.count)} مرکز</span>
                    </Link>
                  ))}
                </div>
              </MenuColumn>
            )}
            {open === "clinic" && (
              <div className="grid grid-cols-[1fr_1.4fr] items-center gap-10">
                <div className="space-y-3">
                  <h3 className="text-xl font-extrabold text-slate-900">خرید آنلاین خدمات با تخفیف</h3>
                  <p className="text-sm leading-7 text-muted">پکیج خدمات دندانپزشکی، زیبایی، روانشناسی و چکاپ را آنلاین بخرید و با کد استفاده به پزشک یا مرکز مراجعه کنید.</p>
                  <Link href="/offer" className="btn-primary">مشاهده همه پکیج‌ها</Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {CLINIC_CATS.map(([key, label]) => (
                    <Link key={key} href={`/offer?category=${key}`} className="flex items-center gap-3 rounded-2xl border border-line p-4 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:bg-rose-50">
                      <OfferIcon category={key} className="size-7 text-rose-500" /> {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {open === "lab" && (
              <div className="grid grid-cols-[1fr_1.2fr] items-center gap-10">
                <div className="space-y-3">
                  <h3 className="text-xl font-extrabold text-slate-900">پذیرش آنلاین آزمایشگاه، بدون صف</h3>
                  <p className="text-sm leading-7 text-muted">آزمایش‌ها را انتخاب یا نسخه را بارگذاری کنید، زمان مراجعه یا نمونه‌گیری در منزل را رزرو کنید و جواب را آنلاین ببینید.</p>
                  <Link href="/centers/type/laboratory?online_reception=true" className="btn-primary">رزرو پذیرش آزمایشگاه</Link>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {LAB_LINKS.map(({ icon: I, label }) => (
                    <Link key={label} href="/centers/type/laboratory?online_reception=true" className="flex items-center gap-3 rounded-2xl border border-line p-4 text-sm font-medium text-slate-700 transition hover:border-brand-300 hover:bg-brand-50">
                      <I className="size-7 text-brand-600" /> {label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* mobile drawer */}
      {mobile && (
        <nav className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-line bg-white xl:hidden">
          <div className="container-page divide-y divide-line py-2">
            {NAV.map((item) => (
              <details key={item.key} className="group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-3 font-semibold text-slate-800">
                  {item.label} <ChevronDown className="size-4 transition group-open:rotate-180" />
                </summary>
                <div className="grid grid-cols-2 gap-1 pb-3">
                  <Link href={item.href} className="col-span-2 rounded-lg bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-700">همه {item.label}</Link>
                  {item.key === "office" && popularSpecs.map((s) => <Link key={s.slug} href={`/doctors/expertise/${s.slug}`} className="rounded-lg px-3 py-2 text-sm text-slate-700">{s.name}</Link>)}
                  {item.key === "online" && ONLINE_TYPES.map((t) => <Link key={t.href} href={t.href} className="rounded-lg px-3 py-2 text-sm text-slate-700">{t.title}</Link>)}
                  {item.key === "centers" && menu?.center_types.map((t) => <Link key={t.type} href={`/centers/type/${t.type}`} className="rounded-lg px-3 py-2 text-sm text-slate-700">{t.label}</Link>)}
                  {item.key === "clinic" && CLINIC_CATS.map(([key, label]) => <Link key={key} href={`/offer?category=${key}`} className="rounded-lg px-3 py-2 text-sm text-slate-700">{label}</Link>)}
                </div>
              </details>
            ))}
            <Link href="/panel/appointments" className="flex items-center gap-2 py-4 font-semibold text-slate-800"><CalendarCheck className="size-4 text-brand-600" /> نوبت‌های من</Link>
          </div>
        </nav>
      )}
      {me && <NotificationWatcher />}
    </header>
  );
}

function MenuColumn({ title, more, children }: { title: string; more?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
        <h3 className="text-sm font-bold text-slate-500">{title}</h3>
        {more && <Link href={more.href} className="text-xs font-semibold text-brand-700">{more.label}</Link>}
      </div>
      {children}
    </div>
  );
}
