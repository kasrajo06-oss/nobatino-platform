<div dir="rtl">

# ۸. فرانت‌اند

Next.js 15 (App Router) + React 19 + TypeScript، کاملاً راست‌به‌چپ (`<html lang="fa" dir="rtl">`).

## مسیرها

### عمومی (رندر سمت سرور، قابل ایندکس)
| مسیر | فایل | توضیح |
|---|---|---|
| `/` | `app/page.tsx` | صفحه اصلی: جستجو، خدمات، تخصص‌ها، مشاوره آنلاین، پزشکان منتخب، شهرها با عکس، بیماری‌ها، مراکز، کلینیک، مجله، نظرات |
| `/doctors` | `app/doctors/page.tsx` | همه پزشکان |
| `/doctors/city/[city]` | | پزشکان یک شهر (با بنر عکس شهر) |
| `/doctors/expertise/[specialty]` | | پزشکان یک تخصص |
| `/doctors/city/[city]/expertise/[specialty]` | | ترکیب شهر و تخصص |
| `/best-doctor/[condition]` | | پزشکان مرتبط با یک بیماری |
| `/doctors/telehealth`، `/doctors/telehealth/[type]` | | مشاوره آنلاین (همه / تلفنی / متنی / ویدیویی) |
| `/doctor/[slug]/[shortId]` | | پروفایل پزشک + ویجت رزرو؛ slug اشتباه ← ریدایرکت ۳۰۸ به آدرس درست |
| `/specialties` | | همه تخصص‌ها و فوق‌تخصص‌ها |
| `/centers`، `/centers/type/[type]`، `/center/[slug]` | | مراکز درمانی و پذیرش آنلاین آزمایشگاه |
| `/offer`، `/offer/[slug]` | | کلینیک (پکیج خدمات) |
| `/mag`، `/mag/category/[slug]`، `/mag/[slug]` | | مجله سلامت |
| `/pages/[slug]`، `/faq`، `/credits` | | محتوا |
| `/sitemap.xml`، `/robots.txt` | `sitemap.ts`، `robots.ts` | سئو |

### نیازمند ورود (middleware: بدون کوکی نشست ← `/login?next=...`)
| مسیر | توضیح |
|---|---|
| `/login` | ورود با OTP (نمایش کد در توسعه/staging، دکمه حساب‌های نمایشی) |
| `/booking/[code]` | تکمیل رزرو و پرداخت نوبت/مشاوره |
| `/orders/[id]` | پرداخت پکیج و نمایش کد استفاده |
| `/consult/[code]` | اتاق مشاوره: چت، فایل، تماس صوتی/تصویری |
| `/notifications` | همه اعلان‌ها |
| `/payment/fake-gateway`، `/payment/result` | درگاه آزمایشی و نتیجه پرداخت |
| `/join/doctor`، `/join/center` | ثبت‌نام پزشک/مرکز |
| `/panel/*` | پنل بیمار: نوبت‌ها، مشاوره‌ها، خریدها، خانواده، کیف پول، نظرات، پروفایل |
| `/doctor-panel/*` | پنل پزشک: داشبورد، نوبت‌ها، مشاوره آنلاین، برنامه کاری، مطب‌ها، پکیج‌ها، نظرات، مالی، پروفایل |
| `/center-panel/*` | پنل مرکز: پذیرش‌ها، برنامه، آزمایش‌ها، پکیج‌ها، مالی، اطلاعات |
| `/ops/*` | پنل اپراتور |

نقش کاربر در `PanelShell` بررسی می‌شود (کاربر بدون دسترسی پیام «دسترسی ندارید» می‌بیند)؛ کنترل اصلی دسترسی همیشه در بک‌اند است.

## ساختار کد

```
src/
├── app/                         مسیرها (هر پوشه = یک URL)
├── components/
│   ├── layout/                  Header (سرور) + HeaderClient (مگامنو، موبایل)، Footer، Logo، StagingBanner
│   ├── search/SearchBox         جستجو با پیشنهاد
│   ├── doctors/                 DoctorCard، DoctorFilters + SortBar، DoctorListPage، ReviewList
│   ├── centers/                 CenterCard، CenterListPage
│   ├── booking/                 SlotPicker، PatientPicker، DoctorBooking، ConsultBooking، BookingTabs، LabBooking
│   ├── consult/CallPanel        تماس WebRTC
│   ├── notifications/           NotificationBell، NotificationWatcher (toast، دسکتاپ، پنجره تماس)
│   ├── offers/، magazine/       کارت‌ها و خرید پکیج
│   ├── panel/                   PanelShell، AppointmentRow، DayAppointments، ScheduleEditor، FinancePanel، ConsultList، ProviderPackages، BarChart، useList
│   ├── home/                    Section، HeroVisual
│   └── ui/                      Avatar، Stars، Breadcrumbs، JsonLd، Markdown، Modal، Alert، Pagination، ...
├── lib/
│   ├── api.ts                   کلاینت مرورگر (`/api/...`، کوکی، refresh خودکار روی 401)
│   ├── server-api.ts            fetch سمت سرور با کش (`revalidate`) و ارسال کوکی برای صفحات خصوصی
│   ├── use-me.ts                کاربر جاری (فقط اگر کوکی `has_session` باشد درخواست می‌دهد)
│   ├── types.ts، consult.ts، offers.ts، magazine.ts، notifications.ts  انواع داده
│   ├── format.ts                تومان، تاریخ شمسی (Intl با تقویم فارسی)، ارقام فارسی
│   ├── icons.tsx                نگاشت تخصص/بیماری/مرکز به آیکون Health Icons
│   ├── cities.ts                عکس شهرها و منابع
│   ├── ringtone.ts              زنگ تماس و صدای اعلان (WebAudio، بدون فایل صوتی)
│   └── home.ts                  داده صفحه اصلی/مگامنو
└── middleware.ts                محافظت از مسیرهای خصوصی
```

## داده و وضعیت
- **صفحات عمومی**: کامپوننت سرور + `serverGet()` با کش ۳۰ تا ۳۶۰۰ ثانیه. صفحه اصلی و صفحاتی که در زمان build به API نیاز دارند `dynamic = "force-dynamic"` هستند تا build بدون API هم موفق شود.
- **بخش‌های تعاملی**: TanStack Query (`useQuery`، `useInfiniteQuery`)؛ کلید کش مشترک مثل `["me"]`، `["notif-summary"]`.
- **API کلاینت** (`lib/api.ts`): درخواست به `/api/...` با `credentials: include`؛ روی 401 یک‌بار `/auth/refresh` و تکرار؛ خطاها به `ApiError` با پیام فارسی سرور تبدیل می‌شوند.
- بعد از ورود و خروج، **ناوبری کامل صفحه** (`window.location.assign`) انجام می‌شود تا پاسخ‌های prefetch قدیمی روتر (ریدایرکت به login) استفاده نشوند.
- **Polling**: پیام‌های مشاوره هر ۳ ثانیه، سیگنال تماس ۰٫۸ تا ۲٫۵ ثانیه، خلاصه اعلان‌ها هر ۶ ثانیه.

## ظاهر
- **Tailwind CSS 4**؛ رنگ‌های برند در `globals.css` (`--color-brand-*`). کلاس‌های پرتکرار به‌صورت `@utility`: `btn-primary`، `btn-outline`، `btn-ghost`، `card`، `input`، `chip`، `container-page`.
- فونت **وزیرمتن** محلی (`app/fonts/Vazirmatn.woff2`، مجوز OFL) — به اینترنت خارج وابسته نیست.
- آیکون‌ها: `lucide-react` (رابط) و `healthicons-react` (پزشکی، MIT/CC0).
- آواتار پزشک بدون عکس: تصویر پزشک زن/مرد بر اساس جنسیت؛ مراکز بدون لوگو: آیکون نوع مرکز.
- عکس شهرها از Wikimedia Commons با مجوز آزاد (`public/images/cities/` و فهرست منابع در `src/data/city-credits.json` و صفحه `/credits`).
- واکنش‌گرا: منوی کشویی موبایل زیر `xl`، فیلترها در پنجره پایین صفحه، بدون اسکرول افقی در عرض ۳۹۰ پیکسل (تست E2E).

## سئو
- `generateMetadata` برای عنوان و توضیح هر صفحه، `canonical`.
- JSON-LD: `Physician`، `MedicalClinic` / `Hospital` / `DiagnosticLab` / `Pharmacy`، `BreadcrumbList`، `FAQPage`، `MedicalWebPage` (مقالات)، `Offer`.
- `sitemap.xml` پویا: شهرها، تخصص‌ها، ترکیب شهر×تخصص، بیماری‌ها، همه پزشکان، مراکز، مقالات، پکیج‌ها.
- `robots.txt` مسیرهای خصوصی را مستثنا می‌کند؛ در staging کل سایت noindex است.

## اسکریپت‌ها

| دستور | کار |
|---|---|
| `npm run dev` | توسعه |
| `npm run build` / `npm run start` | نسخه production |
| `npm run lint` / `npx tsc --noEmit` | کیفیت کد |
| `npx playwright test` | تست‌های E2E |
| `node scripts/screenshots.mjs` | به‌روزرسانی تصاویر مستندات |

</div>
