<div dir="rtl">

# ۱۰. مشاوره آنلاین و تماس تصویری

## چرخه مشاوره

```mermaid
sequenceDiagram
    participant P as بیمار
    participant API as Django
    participant D as پزشک
    P->>API: POST /me/consultations {doctor, kind, complaint, slot?}
    API-->>P: Appointment (pending_payment) + Consultation (waiting)
    P->>API: پرداخت (کیف پول / درگاه)
    API->>API: on_appointment_confirmed: مهلت پزشک + پیام سیستمی
    API-->>D: اعلان «درخواست مشاوره» + پیامک
    D->>API: اولین پیام / پذیرش / شروع تماس
    API->>API: state = active
    API-->>P: اعلان «مشاوره آغاز شد» + پیامک
    loop گفتگو
        P->>API: پیام/فایل
        API-->>D: اعلان پیام جدید (ادغام‌شده)
        D->>API: پاسخ
        API-->>P: اعلان پیام جدید
    end
    D->>API: POST close {summary}
    API->>API: state = closed، نوبت attended
    API-->>P: اعلان پایان + امکان ثبت نظر
```

- هر مشاوره یک `Appointment` (با `kind` = `phone` / `text` / `video`) + یک `Consultation` است؛ پس پرداخت، استرداد، نظر و پشتیبانی اپراتور مثل نوبت مطب کار می‌کند.
- **مهلت‌ها و استرداد خودکار**: [قوانین کسب‌وکار](07-business-rules.md#مشاوره-آنلاین-appsconsultservicespy). کار `expire_consultations` هر دقیقه اجرا می‌شود.
- **چت**: پیام‌ها با `GET .../messages/?after={آخرین id}` هر ۳ ثانیه دریافت می‌شوند (بدون نیاز به WebSocket).

## تماس صوتی/تصویری (WebRTC)

تماس **مستقیم بین دو مرورگر** است؛ صدا و تصویر از سرور عبور نمی‌کند (مگر از طریق TURN وقتی اتصال مستقیم ممکن نیست). شماره تلفن طرفین برای هم نمایش داده نمی‌شود.

### سیگنالینگ از طریق API
برای تبادل اطلاعات اتصال، به‌جای WebSocket از همان API و **polling** استفاده می‌شود (`/me/consultations/{code}/signals/`) تا پشت هر پروکسی و فایروالی کار کند.

```mermaid
sequenceDiagram
    participant A as تماس‌گیرنده (معمولاً پزشک)
    participant S as API (CallSignal)
    participant B as طرف مقابل
    A->>S: ring {callId}
    S-->>B: اعلان «تماس ورودی» (پنجره زنگ در هر صفحه)
    A->>S: offer {sdp, callId}
    A->>S: candidate × n (فقط بعد از offer)
    B->>S: poll ← offer + candidates
    B->>B: کاربر «پاسخ» می‌زند، getUserMedia
    B->>S: answer {sdp, callId}
    B->>S: candidate × n
    A->>S: poll ← answer + candidates
    A-->>B: اتصال مستقیم (یا از طریق TURN)
    A->>S: hangup {callId}
```

نکات پیاده‌سازی (`frontend/src/components/consult/CallPanel.tsx`):
- هر تماس یک **`callId`** تصادفی دارد؛ candidateهای تماس‌های قبلی با تماس جدید قاطی نمی‌شوند.
- candidateهای محلی **تا ارسال offer/answer صف می‌شوند** تا طرف مقابل هرگز آن‌ها را قبل از offer دریافت نکند (این مشکل در عمل باعث وصل نشدن تصادفی تماس می‌شد و رفع شده است).
- candidateهای دریافتی قبل از offer/answer بافر و بعد اعمال می‌شوند.
- سیگنال‌های قدیمی‌تر از ۶۰ ثانیه هنگام ورود به صفحه نادیده گرفته می‌شوند؛ سیگنال‌ها بعد از ۲ ساعت از پایگاه داده پاک می‌شوند.
- امکانات: تست دوربین/میکروفون قبل از تماس، زنگ، قطع/وصل صدا و تصویر، زمان‌سنج، «تلاش مجدد» در صورت قطع، هشدار وقتی سایت روی https نیست.
- رویدادهای `ring` / `answer` / `decline` / `hangup` اعلان «تماس ورودی» و «تماس بی‌پاسخ» را مدیریت می‌کنند ([اعلان‌ها](11-notifications.md)).

### پیش‌نیازهای شبکه
| مورد | توضیح |
|---|---|
| **HTTPS** | مرورگرها دوربین/میکروفون را فقط روی https یا `localhost` می‌دهند. |
| **STUN** | کشف آدرس عمومی؛ در production همان coturn سرور. |
| **TURN** | رله وقتی اتصال مستقیم ممکن نیست (اینترنت موبایل، NAT سخت) — در ایران تقریباً ضروری. سرویس `coturn` در `infra/docker-compose.prod.yml` با کاربر/رمز `TURN_USER`/`TURN_PASSWORD`، پورت `3478` (UDP/TCP) و بازه `49160-49200/udp`. |
| `NEXT_PUBLIC_ICE_SERVERS` | فهرست STUN/TURN برای مرورگر؛ در build production خودکار از دامنه ساخته می‌شود. |

### تست
- `e2e/booking.spec.ts` → «video consultation»: دو مرورگر با دوربین/میکروفون مجازی، پزشک تماس می‌گیرد، بیمار پاسخ می‌دهد، اتصال برقرار و تصویر طرف مقابل دریافت می‌شود، قطع تماس به طرف دیگر می‌رسد.
- «notifications»: بیمار در صفحه دیگری است، پنجره تماس ورودی باز می‌شود و پاسخ او را به اتاق و تماس وصل می‌کند.

### محدودیت‌ها
- تماس فقط داخل مرورگر است؛ تماس تلفنی واقعی (شماره مجازی) نیاز به اپراتور تلفنی دارد ([نقشه راه](15-roadmap.md)).
- اعلان تماس وقتی سایت کاملاً بسته است نمی‌رسد (پیامک یادآوری با لینک اتاق قبل از زمان تماس ارسال می‌شود).

</div>
