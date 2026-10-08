# راهنمای آنلاین کردن سایت

این راهنما سایت را روی یک سرور لینوکسی با دامنه و SSL واقعی بالا می‌آورد؛ اول به‌صورت **نسخه آزمایشی (staging)** و بعد **عمومی**.

## ۰. پیش‌نیازها

| مورد | توضیح |
|---|---|
| سرور | Ubuntu 22.04 یا 24.04، حداقل ۴ هسته، ۸ گیگ رم، ۸۰ گیگ SSD (ترجیحاً دیتاسنتر ایران) |
| دامنه | مثلاً `example.ir` |
| DNS | دو رکورد A: `example.ir` و `www.example.ir` → IP سرور |
| بعداً برای عمومی شدن | پنل پیامک (کاوه‌نگار یا sms.ir)، مرچنت زرین‌پال، اینماد |

## ۱. آماده‌سازی سرور (یک بار)

```bash
ssh root@SERVER_IP
# کد پروژه را روی سرور بیاورید (یکی از دو روش):
git clone <آدرس مخزن خصوصی شما> /opt/doctor-platform        # روش ۱: گیت
# scp -r doctor-platform root@SERVER_IP:/opt/                # روش ۲: کپی مستقیم از کامپیوتر خودتان

cd /opt/doctor-platform
bash infra/scripts/server-setup.sh
```

این اسکریپت Docker را از مخازن خود اوبونتو نصب می‌کند، میرور داکر (پیش‌فرض آروان‌کلاد) را تنظیم می‌کند و پورت‌های لازم را در فایروال باز می‌کند:
`22`، `80`، `443`، `3478 tcp/udp` و `49160-49200 udp` (برای تماس صوتی/تصویری).
اگر سرور در ارائه‌دهنده‌ای است که فایروال جداگانه در پنل دارد (مثل آروان)، همین پورت‌ها را آنجا هم باز کنید.

## ۲. تنظیمات

```bash
cd /opt/doctor-platform/infra
cp .env.example .env
nano .env
```

حداقل این‌ها را عوض کنید:

- `DOMAIN`، `LETSENCRYPT_EMAIL`، `BRAND_NAME`، `SUPPORT_PHONE`
- همه رمزها: `POSTGRES_PASSWORD`، `DJANGO_SECRET_KEY` (یک رشته تصادفی بلند)، `MINIO_ROOT_PASSWORD`، `TURN_PASSWORD`، `BASIC_AUTH_PASSWORD`
  (برای ساخت رمز تصادفی: `openssl rand -base64 32`)

اگر سرور به Docker Hub / PyPI / npm دسترسی ندارد، میرورها را در انتهای `.env` تنظیم کنید
(`PIP_INDEX_URL`، `NPM_REGISTRY`، `PY_IMAGE`، `NODE_IMAGE`). میرور فعال در ایران را از ارائه‌دهنده سرور خود بپرسید.

## ۳. اجرا

```bash
./scripts/deploy.sh
```

- بار اول گواهی SSL رایگان Let's Encrypt را می‌گیرد (دامنه باید از قبل به IP سرور اشاره کند).
- همه سرویس‌ها را می‌سازد و اجرا می‌کند: پایگاه داده، Redis، API، Celery، فرانت، nginx، TURN، بکاپ روزانه، تمدید خودکار SSL.
- با `STAGING=true`، کل سایت پشت نام کاربری/رمز (`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`) است و از گوگل پنهان می‌ماند.

ساخت حساب مدیر کل (با همین شماره و کد یکبار مصرف وارد می‌شوید):

```bash
./scripts/manage.sh make_admin 09121234567 --role superadmin --first-name علی --last-name رضایی
```

پنل اپراتور: `https://DOMAIN/ops` — پنل ادمین جنگو (پشتیبان): `https://DOMAIN/admin`

## ۴. نسخه آزمایشی (بدون پنل پیامک)

با `STAGING=true`:

- کد ورود روی صفحه ورود نمایش داده می‌شود (چون پیامکی ارسال نمی‌شود).
- درگاه پرداخت آزمایشی است و پول واقعی جابه‌جا نمی‌شود.
- بالای سایت نوار «نسخه آزمایشی» دیده می‌شود.
- با `SEED_FAKE_DATA=true` پزشکان و مراکز نمایشی ساخته می‌شوند تا بتوانید سایت را به دیگران نشان دهید.
  قبل از ورود پزشکان واقعی آن را `false` کنید و پایگاه داده را خالی بسازید (بخش ۷).

> ⚠️ هرگز سایت را با `STAGING=true` و بدون رمز عمومی نکنید: هر کسی می‌تواند با شماره دیگران وارد حساب آن‌ها شود.

## ۵. عمومی کردن سایت

وقتی پنل پیامک و درگاه پرداخت آماده شد، در `.env`:

```env
STAGING=false
SEED_FAKE_DATA=false

SMS_BACKEND=apps.notifications.sms.KavenegarSmsBackend
KAVENEGAR_API_KEY=...
KAVENEGAR_OTP_TEMPLATE=verify          # قالب تأییدشده با یک توکن

# یا sms.ir:
# SMS_BACKEND=apps.notifications.sms.SmsIrBackend
# SMSIR_API_KEY=...  SMSIR_OTP_TEMPLATE_ID=...  SMSIR_LINE_NUMBER=...

PAYMENT_GATEWAY=zarinpal
ZARINPAL_MERCHANT_ID=...
ZARINPAL_SANDBOX=false
```

و دوباره `./scripts/deploy.sh`. با `STAGING=false` سرور اجازه اجرا با پیامک یا پرداخت آزمایشی را **نمی‌دهد** (خطا می‌دهد) تا اشتباهی منتشر نشود.

## ۶. به‌روزرسانی سایت

```bash
cd /opt/doctor-platform && git pull     # یا کپی فایل‌های جدید
cd infra && ./scripts/deploy.sh
```

مایگریشن پایگاه داده و داده‌های مرجع به‌صورت خودکار اجرا می‌شوند.

## ۷. نگهداری

| کار | دستور (داخل `infra/`) |
|---|---|
| وضعیت سرویس‌ها | `docker compose -f docker-compose.prod.yml --env-file .env ps` |
| لاگ‌ها | `docker compose -f docker-compose.prod.yml --env-file .env logs -f backend` |
| بکاپ‌ها | پوشه `infra/backups/` (روزانه، ۱۴ روز) — یک نسخه را خارج از سرور هم نگه دارید |
| بازگردانی بکاپ | `docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres pg_restore -U doctor -d doctor --clean < backups/db-XXXX.dump` |
| پاک کردن داده‌های نمایشی و شروع تمیز | `docker compose -f docker-compose.prod.yml --env-file .env down -v` (⚠️ همه داده‌ها حذف می‌شوند) و سپس `./scripts/deploy.sh` |

## ۸. تماس صوتی و تصویری

- مرورگر فقط روی https به دوربین/میکروفون دسترسی می‌دهد؛ با SSL مرحله ۳ این برقرار است.
- سرویس TURN (coturn) روی همان سرور اجرا می‌شود تا تماس روی اینترنت موبایل و مودم‌ها هم وصل شود؛ پورت‌های UDP بخش ۱ باید باز باشند.
- تست: دو مرورگر یا دو دستگاه، یکی پزشک نمایشی و یکی بیمار؛ در اتاق مشاوره ویدیویی «شروع تماس».

## ۹. موارد حقوقی و کسب‌وکاری (قبل از عمومی شدن)

- **اینماد** (نماد اعتماد الکترونیکی) — شرط دریافت درگاه پرداخت واقعی
- **ثبت در ساماندهی** پایگاه‌های اینترنتی
- **مجوزهای حوزه سلامت** برای نوبت‌دهی و به‌خصوص مشاوره آنلاین پزشکی (ضوابط وزارت بهداشت و سازمان نظام پزشکی درباره سلامت از راه دور) — جزئیات را با مشاور حقوقی این حوزه بررسی کنید
- متن نهایی «قوانین»، «حریم خصوصی» و «درباره ما» (از پنل ادمین → صفحات)
- احراز پزشکان واقعی: بررسی شماره نظام پزشکی و مدارک قبل از تأیید در پنل اپراتور
