<div dir="rtl">

# ۱۳. تست و کیفیت

## بک‌اند (pytest)

```bash
cd backend
.venv/Scripts/python -m pytest                    # SQLite
DATABASE_URL=postgres://doctor:doctor@localhost:5432/doctor .venv/Scripts/python -m pytest   # PostgreSQL
.venv/Scripts/ruff check .
.venv/Scripts/python manage.py makemigrations --check --dry-run
```

| فایل | پوشش |
|---|---|
| `tests/test_flows.py` | ابزارها (موبایل، کد ملی، یکسان‌سازی فارسی)، OTP و قفل ارسال مجدد، جستجو و فیلترها، مخفی بودن پزشک تأییدنشده، زمان‌های خالی، رزرو و پرداخت درگاه، **رزرو همزمان**، قانون یک نوبت در روز، پروفایل ناقص، انقضای نگه‌داشت، پرداخت با کیف پول و استرداد، لغو توسط پزشک، دسترسی نقش‌ها، برنامه کاری و مرخصی، مالکیت مطب، ثبت‌نام پزشک و تأیید اپراتور، پذیرش آزمایشگاه، کش اولین نوبت گذشته، بسته بودن ایجاد مستقیم توسط اپراتور |
| `tests/test_consult.py` | تعرفه و زمان تماس، چرخه کامل مشاوره متنی، خصوصی بودن مشاوره، استرداد خودکار، رزرو تماس تصویری و سیگنال‌ها، لغو بیمار، مشاوره فوری، نمایش کد OTP فقط با تنظیم، endpoint صفحه اصلی، **فایل‌های خصوصی و لینک امضاشده** |
| `tests/test_phase3.py` | مجله (عمومی و ویرایشگر)، خرید پکیج با کیف پول و ثبت استفاده، خرید با درگاه و استرداد، محدودیت خرید و تأیید پکیج، انقضای سفارش |
| `tests/test_notifications.py` | اعلان رویدادهای مشاوره و ادغام پیام‌ها، تماس ورودی/پاسخ/بی‌پاسخ، اعلان نوبت مطب و لغو، خصوصی بودن اعلان‌ها |

مجموع: **۴۰ تست** — همه روی SQLite و PostgreSQL پاس می‌شوند. تنظیمات تست: `config/settings/test.py` (Celery همزمان، کش حافظه، فایل‌ها در پوشه موقت).

## E2E (Playwright)

نیاز به بک‌اند با داده نمایشی روی 8000 و فرانت روی 3000:

```bash
cd frontend
npx playwright install chromium     # بار اول
npx playwright test
```

| تست | سناریو |
|---|---|
| patient searches, books, pays | ورود، لیست پزشکان تهران، رزرو، پرداخت درگاه آزمایشی، مشاهده در پنل |
| doctor panel / operator panel | بارگذاری داشبوردها |
| lab reception | انتخاب آزمایش و زمان، ثبت پذیرش |
| home page at phone width | نبود اسکرول افقی در ۳۹۰ پیکسل |
| header mega menu | باز شدن منو با hover |
| online text consultation | بیمار و پزشک در دو مرورگر، پیام، پایان با جمع‌بندی |
| video consultation | تماس واقعی WebRTC با دوربین مجازی، دریافت تصویر دوطرفه، قطع تماس |
| health magazine | لیست و صفحه مقاله |
| clinic package | خرید با درگاه، کد استفاده، ثبت استفاده توسط پزشک، رد استفاده دوباره |
| notifications | toast و نشان زنگوله برای پزشک، پنجره تماس ورودی برای بیمار در صفحه دیگر و اتصال تماس |

تست‌ها بیماران نمایشی را تصادفی انتخاب می‌کنند تا اجرای مکرر به قانون «یک نوبت در روز» برنخورد.

## CI (GitHub Actions)

`.github/workflows/ci.yml` روی هر push و pull request:
- **backend**: PostgreSQL 16 به‌عنوان سرویس، `ruff`، بررسی مهاجرت‌های جاانداخته، `pytest`.
- **frontend**: `npm ci`، `tsc`، `eslint`، `next build`.

</div>
