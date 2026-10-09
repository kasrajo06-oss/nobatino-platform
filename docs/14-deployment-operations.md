<div dir="rtl">

# ۱۴. استقرار و نگهداری

راهنمای قدم‌به‌قدم: **[DEPLOY.md](../DEPLOY.md)**. این سند جزئیات فنی پشت آن است.

## سرویس‌های production (`infra/docker-compose.prod.yml`)

| سرویس | ایمیج | نقش |
|---|---|---|
| `postgres` | postgres:16-alpine | پایگاه داده (volume `pgdata`) |
| `redis` | redis:7-alpine | کش، OTP، صف (AOF فعال) |
| `minio` + `minio-init` | MinIO | تصاویر عمومی؛ باکت `media` فقط دانلود تک‌فایل |
| `backend` | `backend/Dockerfile` | gunicorn با ۴ worker؛ `entrypoint.sh`: migrate + seed_reference (+ seed_fake در staging) |
| `celery-worker`، `celery-beat` | همان ایمیج | کارهای پس‌زمینه |
| `frontend` | `frontend/Dockerfile` | Next.js standalone (~۳۰۰ مگابایت) |
| `coturn` | coturn/coturn | TURN برای تماس (شبکه host) |
| `nginx` | nginx:1.27-alpine | SSL، مسیریابی، Basic Auth در staging، reload هر ۶ ساعت |
| `certbot` | certbot/certbot | تمدید خودکار گواهی هر ۱۲ ساعت |
| `backup` | postgres:16-alpine | `pg_dump` روزانه، نگهداری ۱۴ روز در `infra/backups/` |

مسیرهای nginx: `/api/`، `/admin/`، `/static/` ← Django؛ `/media/` ← MinIO؛ بقیه ← Next.js. `/api/payments/callback` همیشه بدون Basic Auth است تا بازگشت بانک کار کند.

## اسکریپت‌ها (`infra/scripts/`)

| اسکریپت | کار |
|---|---|
| `server-setup.sh` | نصب Docker از مخازن اوبونتو، میرور داکر، فایروال (ufw) |
| `deploy.sh` | ساخت htpasswd در staging، گرفتن SSL بار اول، build و اجرای همه سرویس‌ها |
| `init-ssl.sh` | گواهی موقت ← nginx ← Let's Encrypt ← reload |
| `manage.sh` | اجرای دستورات Django داخل کانتینر (مثلاً `make_admin`) |

## حالت‌های اجرا

| | `STAGING=true` | `STAGING=false` |
|---|---|---|
| دسترسی | Basic Auth برای کل سایت | عمومی |
| موتورهای جستجو | noindex | ایندکس |
| کد ورود | روی صفحه | فقط پیامک |
| پرداخت | آزمایشی مجاز | فقط زرین‌پال |
| داده نمایشی | با `SEED_FAKE_DATA=true` | ممنوع |
| نوار «نسخه آزمایشی» | ✓ | |

## build داخل ایران
Dockerfileها base image و منبع بسته‌ها را از build arg می‌گیرند: `PY_IMAGE`، `NODE_IMAGE`، `PIP_INDEX_URL`، `NPM_REGISTRY`، `APT_MIRROR` (در `infra/.env`). داکر سرور با `server-setup.sh` میرور آروان را می‌گیرد.

## نگهداری روزمره
```bash
cd /opt/doctor-platform/infra
docker compose -f docker-compose.prod.yml --env-file .env ps
docker compose -f docker-compose.prod.yml --env-file .env logs -f backend celery-worker
./scripts/manage.sh make_admin 09121234567 --role operator
./scripts/manage.sh seed_magazine
```

به‌روزرسانی: `git pull` و `./scripts/deploy.sh` (مهاجرت خودکار).

بازگردانی بکاپ:
```bash
docker compose -f docker-compose.prod.yml --env-file .env exec -T postgres \
  pg_restore -U doctor -d doctor --clean < backups/db-YYYYMMDD-HHMMSS.dump
```

## پایش
- `SENTRY_DSN` برای خطاهای بک‌اند.
- لاگ‌های Docker با چرخش (۲۰ مگابایت × ۵).
- در پنل اپراتور: لاگ پیامک (خطاهای سرویس پیامک)، پرداخت‌ها (ناموفق‌ها)، گزارش رویدادها.

## مقیاس‌پذیری
- gunicorn: `--workers` را حدود ۲×هسته + ۱ تنظیم کنید.
- Celery: `--concurrency`.
- PostgreSQL و Redis را می‌توان به سرویس مدیریت‌شده منتقل کرد (فقط `DATABASE_URL` و `REDIS_URL`).
- فرانت stateless است و چند نسخه از آن پشت nginx قابل اجراست.

</div>
