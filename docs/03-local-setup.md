<div dir="rtl">

# ۳. راه‌اندازی محلی

دو روش وجود دارد. روش A ساده‌ترین است.

## پیش‌نیازها

| ابزار | نسخه | برای |
|---|---|---|
| Python | 3.10 یا بالاتر | بک‌اند |
| Node.js | 22 | فرانت |
| Docker Desktop | اختیاری | روش B |
| Git | | |

## روش A: بدون Docker (SQLite)

دو پنجره PowerShell (یا ترمینال) لازم است.

### پنجره ۱ — بک‌اند

```powershell
cd doctor-platform\backend
python -m venv .venv                                  # فقط بار اول
.venv\Scripts\python -m pip install -r requirements-dev.txt
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_reference         # داده مرجع واقعی
.venv\Scripts\python manage.py seed_fake              # پزشک، مرکز، پکیج و مقاله نمایشی (~۳۰ ثانیه)
.venv\Scripts\python manage.py runserver 8000
```

در لینوکس/مک به‌جای `.venv\Scripts\python` از `.venv/bin/python` استفاده کنید.

### پنجره ۲ — فرانت

```powershell
cd doctor-platform\frontend
Copy-Item .env.example .env.local                     # لینوکس/مک: cp .env.example .env.local
npm install
npm run dev                                           # یا: npm run build ; npm run start
```

سایت: http://localhost:3000 — مستندات تعاملی API: http://localhost:8000/api/docs/

### ساخت دوباره پایگاه داده

```powershell
cd backend
Remove-Item db.sqlite3
.venv\Scripts\python manage.py migrate
.venv\Scripts\python manage.py seed_reference
.venv\Scripts\python manage.py seed_fake
```

بعد از ساخت دوباره پایگاه داده، کش صفحات فرانت را هم پاک کنید (شناسه پزشکان عوض می‌شود):

```powershell
Remove-Item -Recurse frontend\.next\cache\fetch-cache
```

## روش B: با Docker (PostgreSQL + Redis + Celery واقعی)

```powershell
cd doctor-platform
docker compose -f infra/docker-compose.yml up --build -d
docker compose -f infra/docker-compose.yml exec backend python manage.py seed_fake
```

سرویس‌ها: `postgres` (5432)، `redis` (6379)، `backend` (8000)، `celery-worker`، `celery-beat`، `frontend` (3000).

- مهاجرت پایگاه داده و `seed_reference` هنگام بالا آمدن backend خودکار اجرا می‌شوند (`backend/entrypoint.sh`).
- فرانت داخل Docker در حالت dev و روی ویندوز کند است. برای سرعت، کانتینر فرانت را متوقف کنید و فرانت را با روش A (پنجره ۲) اجرا کنید؛ به همان backend داکری وصل می‌شود:
  ```powershell
  docker stop doctor-platform-dev-frontend-1
  ```
- توقف: `docker compose -f infra/docker-compose.yml down` (با `-v` پایگاه داده هم پاک می‌شود).
- در ایران برای دانلود ایمیج‌ها، میرور داکر تنظیم کنید (Docker Desktop → Settings → Docker Engine):
  ```json
  "registry-mirrors": ["https://docker.arvancloud.ir"]
  ```

## حساب‌های نمایشی

در صفحه `/login` دکمه‌های «ورود سریع با حساب‌های نمایشی» هست (با `NEXT_PUBLIC_DEMO_MODE=true`). در محیط توسعه پیامکی ارسال نمی‌شود و **کد ۵ رقمی در کادر زرد روی صفحه** نمایش داده می‌شود.

| نقش | موبایل | ویژگی در داده نمایشی |
|---|---|---|
| بیمار | `09120000003` | پروفایل کامل (نام و کد ملی) |
| پزشک | `09120000001` | همه انواع مشاوره آنلاین (متنی ۱۵۰٬۰۰۰، تلفنی ۲۵۰٬۰۰۰، ویدیویی ۳۰۰٬۰۰۰ تومان)، زمان تماس هر روز ۹ تا ۲۳، یک پکیج نمونه |
| کارمند آزمایشگاه | `09120000002` | عضو یکی از آزمایشگاه‌های دارای پذیرش آنلاین |
| اپراتور | `09120000000` | |
| مدیر کل | `09120000009` | دسترسی `/admin` جنگو |
| بیماران نمونه | `09125000000` تا `09125000059` | با سابقه نوبت و نظر |

درگاه پرداخت در توسعه **آزمایشی** است: صفحه‌ای شبیه بانک باز می‌شود که دکمه «پرداخت موفق» و «انصراف» دارد.

## سناریوهای پیشنهادی برای امتحان

1. **نوبت مطب**: جستجوی «تهران» + یک تخصص ← پروفایل پزشک ← انتخاب روز و ساعت ← پرداخت آزمایشی ← «نوبت‌های من».
2. **مشاوره متنی**: «مشاوره آنلاین» ← پزشک دمو ← تب «متنی» ← شرح حال ← پرداخت ← اتاق مشاوره. در مرورگر دیگر (یا پنجره ناشناس) با پزشک دمو وارد شوید، زنگوله اعلان را ببینید و پاسخ دهید.
3. **تماس تصویری**: مشاوره ویدیویی با پزشک دمو رزرو کنید، هر دو وارد اتاق شوید و «شروع تماس» بزنید. روی localhost دوربین کار می‌کند؛ روی IP شبکه نیاز به https است.
4. **آزمایشگاه**: «آزمایشگاه آنلاین» ← انتخاب آزمایش ← زمان ← پرداخت. با حساب آزمایشگاه پذیرش را ثبت و جواب را بارگذاری کنید.
5. **کلینیک**: `/offer` ← خرید پکیج پزشک دمو ← کد استفاده. با پزشک دمو در «پکیج‌های خدمات» کد را ثبت کنید.
6. **اپراتور**: احراز، لغو نوبت با استرداد، انتشار مقاله در مجله.

## رفع اشکال

| مشکل | علت و راه‌حل |
|---|---|
| `Port already in use` / خطای پورت | سرور قبلی هنوز باز است؛ پنجره قبلی را ببندید. در ویندوز: `Get-NetTCPConnection -LocalPort 8000` |
| صفحه سایت خطا می‌دهد | بک‌اند (پنجره ۱) اجرا نیست یا متوقف شده است. |
| کد ورود نمایش داده نمی‌شود | بک‌اند باید با تنظیمات dev اجرا شود (پیش‌فرض `manage.py`). در production کد هرگز نمایش داده نمی‌شود مگر `STAGING=true`. |
| «تعداد درخواست‌ها زیاد است» | محدودیت نرخ OTP. در dev بالا است (۳۰۰ در دقیقه)؛ در production ۱۰ در دقیقه برای هر IP. |
| «کد قبلاً ارسال شده است» | ارسال مجدد کد برای یک شماره فقط بعد از ۶۰ ثانیه ممکن است. |
| دوربین/میکروفون در تماس کار نمی‌کند | سایت باید روی `localhost` یا `https` باز شود؛ اجازه مرورگر را بررسی کنید. |
| پزشکی «نوبت آزاد» دارد ولی ویجت خالی است | بعد از ساخت دوباره پایگاه داده، کش `.next/cache/fetch-cache` را پاک و فرانت را دوباره بسازید. |
| تغییرات بک‌اند اعمال نمی‌شود | `runserver` خودش reload می‌کند؛ اگر با `--noreload` اجرا شده، دوباره اجرا کنید. بعد از تغییر مدل: `manage.py migrate`. |

</div>
