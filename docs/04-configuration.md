<div dir="rtl">

# ۴. پیکربندی (متغیرهای محیطی)

## بک‌اند — `backend/.env` یا متغیرهای محیطی

ماژول تنظیمات با `DJANGO_SETTINGS_MODULE` انتخاب می‌شود: `config.settings.dev` (پیش‌فرض `manage.py`)، `config.settings.prod` (Docker production)، `config.settings.test` (pytest).

### عمومی

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `DJANGO_SECRET_KEY` | `dev-insecure-change-me` | **در production حتماً یک رشته تصادفی بلند**؛ کلید امضای JWT و لینک‌های خصوصی هم هست. |
| `DJANGO_DEBUG` | `False` | در `dev.py` همیشه True است. |
| `DJANGO_ALLOWED_HOSTS` | `localhost,127.0.0.1` | دامنه‌ها، جداشده با کاما. |
| `BRAND_NAME` | `نوبتینو` | نام برند در پیامک‌ها و ادمین. |
| `SITE_URL` | `http://localhost:3000` | آدرس سایت (لینک‌های پیامک، بازگشت از بانک). |
| `API_URL` | `http://localhost:8000` | آدرس عمومی API (آدرس بازگشت درگاه، لینک فایل‌های خصوصی). در production همان دامنه سایت است. |
| `STAGING` | `False` | سرور آزمایشی: اجازه نمایش کد OTP، پرداخت آزمایشی و پیامک کنسولی در prod. |

### پایگاه داده، کش، صف

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `DATABASE_URL` | SQLite در `backend/db.sqlite3` | مثلاً `postgres://user:pass@host:5432/db` |
| `REDIS_URL` | خالی | خالی = کش حافظه و Celery همزمان (eager). |
| `CELERY_BROKER_URL` | `REDIS_URL` یا `memory://` | |
| `CELERY_TASK_ALWAYS_EAGER` | `True` اگر Redis نباشد | |

### احراز هویت و محدودیت‌ها

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `JWT_ACCESS_MINUTES` | `30` | عمر توکن دسترسی |
| `JWT_REFRESH_DAYS` | `30` | عمر توکن تمدید (چرخشی) |
| `JWT_COOKIE_SECURE` | `not DEBUG` | کوکی فقط روی https؛ در prod همیشه True |
| `JWT_COOKIE_DOMAIN` | خالی | اگر فرانت و API روی زیردامنه‌های مختلف‌اند (مثلاً `.example.ir`) |
| `OTP_SHOW_CODE` | `DEBUG` | نمایش کد روی صفحه؛ در prod فقط با `STAGING=true` |
| `OTP_REQUEST_RATE` | `10/min` | درخواست کد برای هر IP |
| `OTP_VERIFY_RATE` | `20/min` | تأیید کد برای هر IP |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:3000` | |
| `CSRF_TRUSTED_ORIGINS` | `http://localhost:3000` | |

ثابت‌های OTP در `config/settings/base.py`: طول ۵ رقم، اعتبار ۱۲۰ ثانیه، ارسال مجدد بعد از ۶۰ ثانیه، حداکثر ۵ تلاش اشتباه.

### پیامک

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `SMS_BACKEND` | `apps.notifications.sms.ConsoleSmsBackend` | یکی از: `ConsoleSmsBackend` (فقط لاگ)، `KavenegarSmsBackend`، `SmsIrBackend` |
| `KAVENEGAR_API_KEY` | | کلید کاوه‌نگار |
| `KAVENEGAR_OTP_TEMPLATE` | `verify` | نام قالب verify (یک توکن) |
| `SMSIR_API_KEY` | | کلید sms.ir |
| `SMSIR_OTP_TEMPLATE_ID` | `0` | شناسه قالب؛ نام پارامتر قالب باید `CODE` باشد |
| `SMSIR_LINE_NUMBER` | | شماره خط برای پیامک‌های غیر OTP |

### پرداخت

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `PAYMENT_GATEWAY` | `fake` | `fake` (درگاه آزمایشی) یا `zarinpal` |
| `ZARINPAL_MERCHANT_ID` | | مرچنت زرین‌پال |
| `ZARINPAL_SANDBOX` | `True` | محیط sandbox زرین‌پال |
| `PLATFORM_COMMISSION_PERCENT` | `10` | کارمزد سامانه از درآمد آنلاین پزشک/مرکز |

ثابت‌های رزرو در `base.py`: `SLOT_HOLD_MINUTES=10`، `SLOT_GENERATION_DAYS=30`، `CANCEL_FULL_REFUND_HOURS=24`.

### فایل‌ها

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `PRIVATE_MEDIA_ROOT` | `backend/private_media` | مدارک پزشکی (نسخه، جواب آزمایش، فایل مشاوره، مدارک پزشک)؛ هرگز مستقیم سرو نمی‌شود |
| `AWS_STORAGE_BUCKET_NAME` | خالی | اگر تنظیم شود، تصاویر عمومی روی S3/MinIO ذخیره می‌شوند |
| `AWS_S3_ENDPOINT_URL` | | مثلاً `http://minio:9000` |
| `AWS_S3_CUSTOM_DOMAIN` | | مثلاً `example.ir/media` |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | | |

### سایر

| متغیر | پیش‌فرض | توضیح |
|---|---|---|
| `SENTRY_DSN` | خالی | گزارش خطا (اختیاری) |
| `SECURE_HSTS_SECONDS` | `0` | فقط در prod؛ بعد از اطمینان از SSL مقدار بدهید |

## فرانت — `frontend/.env.local`

| متغیر | زمان | توضیح |
|---|---|---|
| `NEXT_PUBLIC_BRAND_NAME` | build | نام برند |
| `NEXT_PUBLIC_SITE_URL` | build | آدرس سایت (sitemap، canonical، JSON-LD) |
| `NEXT_PUBLIC_SUPPORT_PHONE` | build | تلفن پشتیبانی در فوتر |
| `NEXT_PUBLIC_DEMO_MODE` | build | `true` = دکمه‌های ورود سریع حساب‌های نمایشی |
| `NEXT_PUBLIC_STAGING` | build | `true` = نوار «نسخه آزمایشی»، noindex |
| `NEXT_PUBLIC_ICE_SERVERS` | build | JSON سرورهای STUN/TURN برای تماس |
| `API_INTERNAL_URL` | build و run | آدرس Django از دید سرور Next (`http://127.0.0.1:8000` در توسعه، `http://backend:8000` در Docker) |

متغیرهای `NEXT_PUBLIC_*` هنگام **build** داخل کد قرار می‌گیرند؛ بعد از تغییر باید دوباره build کنید.

## سرور — `infra/.env`

فایل نمونه کامل با توضیح: [`infra/.env.example`](../infra/.env.example). موارد مهم:

| متغیر | توضیح |
|---|---|
| `DOMAIN`، `LETSENCRYPT_EMAIL` | دامنه و ایمیل گواهی SSL |
| `STAGING`، `SEED_FAKE_DATA`، `BASIC_AUTH_USER`، `BASIC_AUTH_PASSWORD` | حالت آزمایشی (رمزدار، داده نمایشی) |
| `POSTGRES_*`، `DJANGO_SECRET_KEY`، `MINIO_ROOT_*`، `TURN_*` | رمزها |
| `PAYMENT_GATEWAY`، `ZARINPAL_*`، `SMS_BACKEND`، کلیدهای پیامک | سرویس‌های واقعی |
| `PY_IMAGE`، `NODE_IMAGE`، `PIP_INDEX_URL`، `NPM_REGISTRY`، `APT_MIRROR` | میرورها برای build داخل ایران |

</div>
