<div dir="rtl">

# ۶. مرجع API

- آدرس پایه: `/api/` — مستندات تعاملی (Swagger): **`/api/docs/`** و schema OpenAPI در `/api/schema/`.
- همه endpointها هم با `/` انتهایی و هم بدون آن کار می‌کنند.
- قالب داده JSON؛ بارگذاری فایل با `multipart/form-data`.
- **احراز هویت**: کوکی httpOnly `access_token` (وب) یا هدر `Authorization: Bearer <token>` (اپ موبایل). پاسخ 401 = توکن منقضی؛ یک‌بار `POST /api/auth/refresh` و تکرار.
- **صفحه‌بندی** لیست‌ها: `?page=` و `?page_size=` (حداکثر ۱۰۰)؛ پاسخ `{count, next, previous, results}`.
- **خطاها**: `{"detail": "پیام فارسی"}` یا `{"field": ["پیام"]}` با کدهای 400، 401، 403، 404، 405، 409 (تداخل رزرو)، 429 (محدودیت نرخ).

ستون «دسترسی»: 🌐 عمومی، 🔑 کاربر واردشده، 🩺 پزشک، 🏥 کارمند مرکز، 🛡️ اپراتور/مدیر کل.

## احراز هویت

| روش | مسیر | دسترسی | توضیح |
|---|---|---|---|
| POST | `/auth/otp/request` | 🌐 | `{"mobile"}` ← `{mobile, resend_in, expires_in, is_registered, debug_code?}` |
| POST | `/auth/otp/verify` | 🌐 | `{"mobile","code"}` ← `{user, is_new, access, refresh}` + کوکی‌ها |
| POST | `/auth/refresh` | 🌐 | از کوکی `refresh_token` یا `{"refresh"}` |
| POST | `/auth/logout` | 🌐 | پاک کردن کوکی‌ها |

```json
// POST /api/auth/otp/request   {"mobile": "۰۹۱۲۰۰۰۰۰۰۳"}
{"mobile": "09120000003", "resend_in": 60, "expires_in": 120, "is_registered": true, "debug_code": "48213"}
```
`debug_code` فقط وقتی `OTP_SHOW_CODE` فعال است (توسعه یا staging) برگردانده می‌شود.

## داده‌های عمومی

| روش | مسیر | توضیح و پارامترها |
|---|---|---|
| GET | `/provinces/`، `/provinces/{slug}/` | |
| GET | `/cities/`، `/cities/{slug}/` | `?province=`، `?is_popular=true`، `?q=` |
| GET | `/specialties/`، `/specialties/{slug}/` | فقط تخصص‌های اصلی (با `children`)؛ `?all=1` همه؛ `?is_popular=true` |
| GET | `/degrees/`، `/insurances/`، `/conditions/`، `/lab-tests/` | `/insurances/?kind=basic` |
| GET | `/stats/` | `{doctors, centers, appointments, cities}` |
| GET | `/home/` | داده صفحه اصلی و مگامنو: شهرها با تعداد پزشک، تخصص‌ها با تعداد پزشک و پزشک آنلاین، بیماری‌ها، انواع مرکز، نظرات منتخب، تعداد آنلاین‌ها (کش ۶۰ ثانیه) |
| GET | `/search/suggest/?q=&city=` | پیشنهاد جستجو: `{doctors, specialties, conditions, centers}` |
| GET | `/pages/{slug}/`، `/faqs/`، `/banners/` | محتوا |

### پزشکان

| روش | مسیر | توضیح |
|---|---|---|
| GET | `/doctors/` | لیست کارت پزشکان (فقط تأییدشده و فعال) |
| GET | `/doctors/featured/` | ۱۲ پزشک محبوب (همان فیلترها) |
| GET | `/doctors/{short_id}/` | جزئیات + مطب‌ها (با `first_free_slot_at` هر مطب) + تأییدکنندگان + `consult_services` |
| GET | `/doctors/{short_id}/availability/?office=` | ۱۴ روز آینده با تعداد نوبت خالی هر روز |
| GET | `/doctors/{short_id}/slots/?office=&date=YYYY-MM-DD` | ساعت‌های خالی یک روز |
| GET | `/doctors/{short_id}/online-availability/` و `/online-slots/?date=` | همین برای زمان‌های تماس آنلاین |
| GET | `/doctors/{short_id}/reviews/` | نظرات منتشرشده (صفحه‌بندی) |

فیلترهای `/doctors/`:

| پارامتر | مثال | توضیح |
|---|---|---|
| `q` | `احمدی` | نام، تخصص یا شماره نظام (یکسان‌سازی ی/ک و ارقام) |
| `city`، `province` | `tehran` | |
| `specialty` | `cardiology` | شامل فوق‌تخصص‌های آن |
| `condition` | `diabetes` | پزشکان تخصص‌های مرتبط با بیماری |
| `insurance` | `tamin-ejtemaei` | |
| `gender` | `female` | |
| `appointment_type` | `in_person` / `phone` / `text` / `video` | |
| `telehealth` | `true` | هر نوع مشاوره آنلاین |
| `has_free_slot` | `true` | اولین نوبت آزاد در آینده |
| `instant`، `online_now` | `true` | مشاوره فوری / آنلاین همین حالا |
| `ordering` | خالی، `popular`، `nearest_slot`، `most_successful`، `nearest_online_slot`، `online_now` | |

نمونه کارت پزشک:
```json
{
  "id": 11, "short_id": "GzkX4a", "slug": "دکتر-باران-سغیری", "full_name": "دکتر باران سغیری",
  "gender": "female", "photo": null, "degree": "فلوشیپ",
  "primary_specialty": {"id": 40, "name": "اکوکاردیوگرافی", "title": "فلوشیپ اکوکاردیوگرافی", "slug": "echocardiography"},
  "rating_avg": "4.00", "review_count": 1, "recommend_pct": 100, "successful_appointments": 3, "endorsement_count": 4,
  "avg_wait_minutes": 25, "first_free_slot_at": "2026-10-10T09:00:00+03:30", "first_online_slot_at": null,
  "badges": [{"key": "today", "label": "نوبت امروز"}], "consult_types": ["in_person", "phone"],
  "consult_services": [{"kind": "phone", "kind_display": "مشاوره تلفنی", "price": 250000, "duration_minutes": 15, "instant_enabled": false}],
  "available_now": false,
  "main_office": {"id": 3, "city": "تهران", "city_slug": "tehran", "address": "...", "visit_fee": 450000},
  "offices_count": 1, "insurances": ["تأمین اجتماعی"], "offers_instant": false
}
```

### مراکز

| روش | مسیر | توضیح |
|---|---|---|
| GET | `/centers/` | `?type=`، `?city=`، `?province=`، `?insurance=`، `?specialty=`، `?q=`، `?online_reception=true`، `?has_home_sampling=true`، `?is_24h=true` |
| GET | `/centers/stats/` | تعداد هر نوع مرکز |
| GET | `/centers/{slug}/` | جزئیات + تعرفه آزمایش‌ها + پزشکان مرکز |
| GET | `/centers/{slug}/availability/`، `/centers/{slug}/slots/?date=` | زمان‌های پذیرش |

### مجله و کلینیک

| روش | مسیر | توضیح |
|---|---|---|
| GET | `/magazine/categories/`، `/magazine/categories/{slug}/` | با `article_count` |
| GET | `/magazine/articles/` | `?category=`، `?specialty=`، `?condition=`، `?featured=true`، `?q=`، `?ordering=popular` |
| GET | `/magazine/articles/{slug}/` | متن کامل (بازدید +۱) |
| GET | `/magazine/articles/{slug}/related/` | `{articles, doctors}` |
| GET | `/offers/` | `?category=`، `?city=`، `?doctor={short_id}`، `?center={slug}`، `?q=`، `?ordering=cheapest/newest` |
| GET | `/offers/categories/`، `/offers/{slug}/` | |

## حساب کاربر (🔑)

| روش | مسیر | توضیح |
|---|---|---|
| GET / PATCH | `/me/` | پروفایل (موبایل و نقش قابل تغییر نیستند) |
| CRUD | `/me/family/` | اعضای خانواده |
| GET | `/me/wallet/` | `{balance, transactions}` |
| GET | `/me/payments/`، `/me/payments/{id}/` | |
| GET | `/me/appointments/?scope=upcoming|past&kind=` | نوبت‌های من |
| POST | `/me/appointments/` | رزرو؛ نمونه پایین |
| GET | `/me/appointments/{tracking_code}/` | |
| POST | `/me/appointments/{tracking_code}/cancel/` | `{"reason"}` ← `{appointment, refunded}` |
| GET / POST | `/me/reviews/` | ثبت نظر: `{appointment, rating, recommends, wait_minutes, text, show_name}` (فقط نوبت `attended`) |

رزرو نوبت مطب:
```json
// POST /api/me/appointments/
{"slot": 1532, "family_member": null, "note": "سابقه فشار خون"}
// 201: {"tracking_code": "73810452", "status": "pending_payment", "price": 50000, "held_until": "...", ...}
// 409: {"detail": "متأسفانه این نوبت لحظاتی پیش رزرو شد. لطفاً زمان دیگری انتخاب کنید."}
```
پذیرش آزمایشگاه (multipart): `slot`، `tests` (چندتایی)، `prescription` (فایل)، `has_insurance_prescription`، `home_sampling`، `home_address`.

## پرداخت

| روش | مسیر | دسترسی | توضیح |
|---|---|---|---|
| POST | `/payments/start` | 🔑 | `{"tracking_code", "use_wallet": true}` ← `{"status": "paid"}` یا `{"redirect_url", "payment_id"}` |
| POST | `/payments/topup` | 🔑 | `{"amount"}` (۱۰٬۰۰۰ تا ۵۰٬۰۰۰٬۰۰۰) ← `{"redirect_url"}` |
| GET | `/payments/callback?pid=&Authority=&Status=OK` | 🌐 (بانک) | تأیید و هدایت به `SITE_URL/payment/result?status=success|failed&tracking_code=|package_order=` |

## مشاوره آنلاین (🔑)

| روش | مسیر | توضیح |
|---|---|---|
| POST | `/me/consultations/` | شروع: `{doctor: short_id, kind: phone|text|video, complaint, slot?, instant?, family_member?}` ← مشاوره + نوبت در انتظار پرداخت |
| GET | `/me/consultations/?state=waiting|active|closed` | مشاوره‌های من (بیمار) |
| GET | `/me/consultations/{code}/` | جزئیات (برای هر دو طرف مشاوره) |
| GET | `/me/consultations/{code}/messages/?after={id}` | پیام‌های جدید + `state` و `appointment_status` |
| POST | `/me/consultations/{code}/messages/` | `text` و/یا `file` (multipart) |
| POST | `/me/consultations/{code}/accept/` | پزشک: شروع مشاوره |
| POST | `/me/consultations/{code}/close/` | پزشک: پایان با `{summary}` |
| POST | `/me/consultations/{code}/cancel/` | بیمار: لغو تا قبل از شروع (استرداد کامل) |
| GET | `/me/consultations/{code}/signals/?after={id}` | سیگنال‌های تماس طرف مقابل |
| POST | `/me/consultations/{code}/signals/` | `{kind: ring|offer|answer|candidate|hangup|decline, payload}` |

همین مسیرها زیر `/doctor-panel/consultations/` برای صندوق پزشک (بدون ایجاد) وجود دارد.

## اعلان‌ها (🔑)

| روش | مسیر | توضیح |
|---|---|---|
| GET | `/me/notifications/?unread=true` | لیست |
| GET | `/me/notifications/summary/` | `{unread, latest (۸ مورد), call}` — هر چند ثانیه poll می‌شود |
| POST | `/me/notifications/read/` | `{"ids": [..]}` یا `{"link": "/consult/123"}` یا `{"all": true}` |

## خرید پکیج (🔑)

| روش | مسیر | توضیح |
|---|---|---|
| POST | `/me/package-orders/` | `{"package": slug}` ← سفارش در انتظار پرداخت (۱۵ دقیقه) |
| GET | `/me/package-orders/`، `/{id}/` | کد استفاده فقط بعد از پرداخت نمایش داده می‌شود |
| POST | `/me/package-orders/{id}/pay/` | `{"use_wallet"}` |
| POST | `/me/package-orders/{id}/cancel/` | قبل از استفاده، استرداد کامل به کیف پول |

## پنل پزشک (🩺)

| روش | مسیر | توضیح |
|---|---|---|
| POST | `/doctor-panel/onboarding` | 🔑 ثبت‌نام پزشک (نقش کاربر پزشک می‌شود) |
| GET / PATCH | `/doctor-panel/profile` | پروفایل (عکس با multipart) |
| POST | `/doctor-panel/submit` | ارسال برای تأیید (نیاز به کارت نظام پزشکی و حداقل یک مطب) |
| GET | `/doctor-panel/dashboard` | آمار امروز، هفته، درآمد ماه |
| CRUD | `/doctor-panel/documents/` | مدارک |
| CRUD | `/doctor-panel/offices/` | مطب‌ها (ویرایش ← بازسازی نوبت‌ها) |
| CRUD | `/doctor-panel/schedules/?office=`، `/doctor-panel/exceptions/` | برنامه هفتگی و مرخصی مطب |
| GET | `/doctor-panel/appointments/?date=&status=&office=&q=` | نوبت‌ها |
| POST | `/doctor-panel/appointments/{code}/attended|no_show|cancel/` | ثبت حضور / لغو با استرداد کامل |
| GET, POST | `/doctor-panel/reviews/`، `/doctor-panel/reviews/{id}/reply/` | نظرات و پاسخ |
| GET, POST | `/doctor-panel/finance` | موجودی و درخواست تسویه `{amount, iban}` |
| GET, PUT | `/doctor-panel/consult-services` | تعرفه مشاوره: `{"services": [{kind, price, duration_minutes, instant_enabled, is_active}]}` |
| POST | `/doctor-panel/presence` | `{"online": true|false}` یا بدون بدنه (ضربان) |
| CRUD | `/doctor-panel/online-schedules/`، `/doctor-panel/online-exceptions/` | زمان‌های تماس آنلاین |
| GET, POST | `/doctor-panel/consultations/...` | صندوق مشاوره (بالا) |
| CRUD | `/doctor-panel/packages/` | پکیج‌ها (ویرایش ← دوباره «در انتظار تأیید») |
| GET | `/doctor-panel/packages/orders/` | فروش‌ها |
| POST | `/doctor-panel/packages/redeem/` | `{"voucher_code"}` ثبت استفاده |
| POST | `/doctor-panel/endorse/{short_id}` | تأیید همکار |

## پنل مرکز (🏥)

مرکز فعال با هدر `X-Center: {id}` یا `?center=` انتخاب می‌شود (پیش‌فرض: اولین مرکز کاربر).

| روش | مسیر | توضیح |
|---|---|---|
| POST | `/center-panel/onboarding` | 🔑 ثبت‌نام مرکز |
| GET | `/center-panel/mine` | مراکز کاربر |
| GET / PATCH | `/center-panel/profile` | |
| CRUD | `/center-panel/lab-tests/` | تعرفه آزمایش‌ها |
| CRUD | `/center-panel/schedules/`، `/center-panel/exceptions/` | برنامه پذیرش |
| GET | `/center-panel/receptions/?date=&status=&q=` | پذیرش‌ها |
| POST | `/center-panel/receptions/{code}/attended|no_show|cancel/` | |
| POST | `/center-panel/receptions/{code}/upload_result/` | `result_file` (multipart) |
| GET, POST | `/center-panel/finance` | |
| CRUD + orders/redeem | `/center-panel/packages/` | مثل پزشک |

## پنل اپراتور (🛡️)

| روش | مسیر | توضیح |
|---|---|---|
| GET | `/ops/dashboard` | آمار و نمودار ۳۰ روز |
| GET / PATCH | `/ops/users/` | `?q=&role=`؛ تغییر نقش و فعال/مسدود |
| POST | `/ops/users/{id}/wallet_adjust/` | `{amount, reason}` |
| GET / PATCH | `/ops/doctors/`، `/ops/centers/` | `?status=&q=` |
| POST | `/ops/doctors|centers/{id}/approve/`، `/reject/` | رد: `{reason}` |
| GET | `/ops/appointments/?q=&status=&date=` | |
| POST | `/ops/appointments/{code}/cancel/` | لغو با استرداد کامل |
| GET, POST | `/ops/reviews/?status=`، `/{id}/approve|reject/` | |
| GET, POST | `/ops/settlements/?status=`، `/{id}/pay/` (`bank_ref`)، `/{id}/reject/` | |
| GET | `/ops/payments/?status=&q=`، `/ops/sms-logs/?mobile=`، `/ops/audit-logs/?action=` | |
| CRUD | `/ops/catalog/specialties|conditions|insurances|cities|lab-tests/` | داده مرجع |
| CRUD | `/ops/articles/`، `/ops/article-categories/` | مجله |
| GET / PATCH, POST | `/ops/packages/?status=`، `/{id}/approve|reject/` | پکیج‌ها |
| GET, POST | `/ops/package-orders/?q=` / `{voucher_code}` | جستجو و استرداد خرید پکیج |

ایجاد مستقیم پزشک، مرکز و پکیج توسط اپراتور مجاز نیست (405)؛ این‌ها از طریق ثبت‌نام و پنل صاحبشان ایجاد می‌شوند.

## فایل‌های خصوصی

`GET /private-media?f={token}` — لینک امضاشده یک‌ساعته که API خودش در فیلدهای فایل خصوصی برمی‌گرداند. توکن دستکاری‌شده یا منقضی ← 404.

</div>
