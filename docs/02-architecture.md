<div dir="rtl">

# ۲. معماری

## نمای کلی

```mermaid
flowchart LR
    U[مرورگر بیمار / پزشک / اپراتور] -->|HTTPS| N[nginx]
    N -->|/ صفحات| F[Next.js 15<br/>SSR + React]
    N -->|/api /admin /static| B[Django 5 + DRF<br/>gunicorn]
    N -->|/media| M[(MinIO<br/>تصاویر عمومی)]
    F -->|fetch سمت سرور<br/>http://backend:8000| B
    B --> P[(PostgreSQL 16)]
    B --> R[(Redis 7<br/>کش + OTP + صف)]
    W[Celery worker] --> R
    W --> P
    CB[Celery beat<br/>زمان‌بندی] --> R
    B -->|پیامک| SMS[کاوه‌نگار / sms.ir]
    B -->|پرداخت| ZP[زرین‌پال]
    U <-->|صدا/تصویر WebRTC| U2[طرف مقابل تماس]
    U -.->|رله در صورت نیاز| T[coturn<br/>TURN]
    B --> PV[(فایل‌های خصوصی<br/>volume)]
```

| جزء | فناوری | نقش |
|---|---|---|
| فرانت‌اند | Next.js 15 (App Router)، React 19، TypeScript، Tailwind CSS 4، TanStack Query 5 | صفحات SSR برای سئو، پنل‌ها، اتاق مشاوره |
| بک‌اند | Django 5.1، Django REST Framework، SimpleJWT، django-filter، drf-spectacular | API، منطق کسب‌وکار، پنل ادمین |
| پایگاه داده | PostgreSQL 16 (در توسعه SQLite هم کار می‌کند) | داده اصلی |
| کش و صف | Redis 7 | کش، کد OTP، محدودیت نرخ، صف Celery |
| کارهای پس‌زمینه | Celery 5 (worker + beat) | پیامک، ساخت نوبت‌ها، انقضا، یادآوری، آمار |
| فایل | MinIO (سازگار با S3) برای تصاویر عمومی؛ volume خصوصی برای مدارک پزشکی | |
| تماس | WebRTC در مرورگر + coturn (TURN) | تماس صوتی/تصویری مشاوره |
| وب‌سرور | nginx + Let's Encrypt | SSL، مسیریابی، محدودیت نرخ، Basic Auth در staging |

## ساختار پوشه‌ها

```
doctor-platform/
├── backend/                  Django
│   ├── config/               تنظیمات (base/dev/test/prod)، urls، celery، wsgi
│   ├── apps/
│   │   ├── core/             ابزارها، صفحه‌بندی، دسترسی‌ها، جستجو، ذخیره خصوصی، دستورات seed
│   │   ├── accounts/         کاربر، OTP، JWT در کوکی، اعضای خانواده، make_admin
│   │   ├── geo/              استان و شهر
│   │   ├── catalog/          تخصص، مدرک، بیماری، بیمه
│   │   ├── doctors/          پروفایل پزشک، مطب، مدارک، تأیید همکار، API پنل پزشک
│   │   ├── centers/          مراکز درمانی، کارمندان، API پنل مرکز
│   │   ├── scheduling/       برنامه هفتگی، مرخصی، Slot، نوبت (Appointment)، رزرو
│   │   ├── lab/              کاتالوگ آزمایش، تعرفه مرکز، پذیرش آزمایشگاه
│   │   ├── consult/          مشاوره آنلاین، پیام، سیگنال تماس، تعرفه و زمان تماس
│   │   ├── payments/         کیف پول، پرداخت، درگاه، تسویه
│   │   ├── reviews/          نظرات و آمار امتیاز
│   │   ├── clinic/           پکیج خدمات و خرید آن
│   │   ├── magazine/         مجله سلامت
│   │   ├── notifications/    پیامک، اعلان درون‌برنامه، یادآوری
│   │   ├── cms/              صفحات ثابت، سؤالات متداول، بنر
│   │   └── ops/              API پنل اپراتور، audit log
│   ├── fixtures/             داده مرجع (JSON)
│   ├── tests/                تست‌های pytest
│   ├── Dockerfile, entrypoint.sh, requirements*.txt
├── frontend/                 Next.js
│   ├── src/app/              مسیرها (صفحات عمومی، پنل‌ها، اتاق مشاوره ...)
│   ├── src/components/       کامپوننت‌ها (layout، booking، consult، panel، notifications، ...)
│   ├── src/lib/              API کلاینت، انواع داده، قالب‌بندی، آیکون‌ها، ...
│   ├── src/data/             منابع تصاویر شهرها
│   ├── public/images/cities/ عکس شهرها (مجوز آزاد)
│   ├── e2e/                  تست‌های Playwright
│   └── scripts/              ابزار گرفتن اسکرین‌شات مستندات
├── infra/                    docker-compose (dev/prod)، nginx، اسکریپت‌های سرور، بکاپ
├── docs/                     همین مستندات
├── .github/workflows/ci.yml  CI
├── README.md, DEPLOY.md
```

## جریان یک درخواست

### صفحه عمومی (مثلاً لیست پزشکان)

```mermaid
sequenceDiagram
    participant B as مرورگر
    participant N as nginx
    participant F as Next.js
    participant D as Django API
    B->>N: GET /doctors/city/tehran
    N->>F: proxy
    F->>D: GET /api/doctors/?city=tehran (سمت سرور، با کش ۳۰ ثانیه)
    D-->>F: JSON
    F-->>B: HTML کامل (سئو) + JS
    B->>N: GET /api/doctors/{id}/availability/ (سمت کاربر)
    N->>D: proxy
    D-->>B: JSON
```

- صفحات عمومی **سمت سرور** رندر می‌شوند تا موتورهای جستجو محتوای کامل را ببینند (`generateMetadata`، JSON-LD، sitemap).
- بخش‌های پویا (زمان‌های خالی، رزرو، پنل‌ها، اتاق مشاوره) **سمت کاربر** با TanStack Query بارگذاری می‌شوند.
- در production، nginx مسیر `/api` را مستقیم به Django می‌فرستد. در توسعه، Next.js با `rewrites` همین مسیر را به `API_INTERNAL_URL` پروکسی می‌کند، پس مرورگر همیشه با **یک دامنه** کار می‌کند و کوکی‌ها مشترک‌اند.

### ورود و احراز هویت

```mermaid
sequenceDiagram
    participant B as مرورگر
    participant D as Django
    participant R as Redis
    participant S as سرویس پیامک
    B->>D: POST /api/auth/otp/request {mobile}
    D->>R: ذخیره هش کد (۲ دقیقه) + قفل ارسال مجدد (۶۰ ثانیه)
    D->>S: ارسال کد (Celery)
    D-->>B: resend_in, (debug_code فقط در توسعه/staging)
    B->>D: POST /api/auth/otp/verify {mobile, code}
    D->>R: مقایسه هش، شمارش تلاش
    D-->>B: Set-Cookie: access_token, refresh_token (httpOnly) + has_session
    B->>D: درخواست‌های بعدی با کوکی
    Note over B,D: با 401، کلاینت یک‌بار /api/auth/refresh می‌زند و تکرار می‌کند
```

جزئیات بیشتر: [امنیت](12-security.md).

### کارهای پس‌زمینه (Celery beat)

| کار | هر چند وقت | کار انجام‌شده |
|---|---|---|
| `generate_slots_task` | ۱ ساعت | ساخت Slotها از برنامه هفتگی برای ۳۰ روز آینده (مطب‌ها، مراکز، زمان‌های تماس آنلاین) |
| `release_expired_holds` | ۱ دقیقه | نوبت‌های پرداخت‌نشده بعد از ۱۰ دقیقه منقضی و آزاد می‌شوند |
| `send_reminders` | ۱۵ دقیقه | یادآوری ۲۴ و ۲ ساعته (پیامک + اعلان) |
| `refresh_all_stats` | ۳۰ دقیقه | محاسبه امتیاز، درصد پیشنهاد، میانگین معطلی و محبوبیت |
| `expire_consultations` | ۱ دقیقه | استرداد مشاوره‌های بی‌پاسخ، بستن گفتگوهای متنی منقضی |
| `expire_package_orders` | ۵ دقیقه | انقضای سفارش‌های پرداخت‌نشده و کدهای منقضی |

در توسعه بدون Redis، Celery به‌صورت **eager** (همزمان، داخل همان درخواست) اجرا می‌شود؛ کارهای زمان‌بندی‌شده اجرا نمی‌شوند مگر با Docker.

## اصول طراحی کد

- **منطق کسب‌وکار در `services.py`** هر اپ است (مثلاً `scheduling/services.py`، `consult/services.py`، `clinic/services.py`)؛ viewها نازک هستند.
- **همه تغییرات وضعیت نوبت** از `scheduling/services.py` می‌گذرند: `book_slot`، `create_appointment`، `confirm_payment`، `cancel_appointment`، `expire_holds`، `mark_attendance`.
- **مشاوره آنلاین و پذیرش آزمایشگاه هر دو یک `Appointment` هستند** (با `kind` متفاوت) تا پرداخت، استرداد، نظر، پنل‌ها و پشتیبانی برای همه یکسان باشد. جزئیات اختصاصی در `Consultation` و `LabReception` (رابطه یک‌به‌یک).
- **قفل و همزمانی**: رزرو با UPDATE شرطی اتمیک (`booked_count < capacity`) و تغییرات حساس با `select_for_update(of=("self",))`؛ روی هر دو SQLite و PostgreSQL امن است.
- **داده‌های کش‌شده** روی پزشک (امتیاز، اولین نوبت آزاد و ...) برای سرعت لیست‌ها نگه داشته و دوره‌ای به‌روز می‌شوند؛ مقدارهای گذشته (مثلاً اولین نوبتی که زمانش گذشته) نادیده گرفته می‌شوند.

</div>
