from django.conf import settings
from django.db import models
from django.urls import reverse  # noqa: F401

from apps.accounts.models import Gender
from apps.core.models import TimeStampedModel
from apps.core.utils import generate_short_id, normalize_fa, slugify_fa


class VerificationStatus(models.TextChoices):
    DRAFT = "draft", "پیش‌نویس"
    PENDING = "pending", "در انتظار تأیید"
    APPROVED = "approved", "تأیید شده"
    REJECTED = "rejected", "رد شده"


class DoctorProfile(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="doctor_profile")
    first_name = models.CharField("نام", max_length=64)
    last_name = models.CharField("نام خانوادگی", max_length=64)
    gender = models.CharField("جنسیت", max_length=8, choices=Gender.choices)
    slug = models.SlugField("اسلاگ", max_length=160, allow_unicode=True, blank=True)
    short_id = models.CharField("شناسه کوتاه", max_length=8, unique=True, editable=False)
    medical_council_no = models.CharField("شماره نظام پزشکی", max_length=16, unique=True)
    degree = models.ForeignKey("catalog.Degree", on_delete=models.PROTECT, verbose_name="مدرک")
    specialties = models.ManyToManyField("catalog.Specialty", related_name="doctors", verbose_name="تخصص‌ها")
    primary_specialty = models.ForeignKey(
        "catalog.Specialty", on_delete=models.PROTECT, related_name="+", verbose_name="تخصص اصلی"
    )
    bio = models.TextField("درباره پزشک", blank=True)
    photo = models.ImageField("عکس", upload_to="doctors/", blank=True)
    experience_start_year = models.PositiveIntegerField("سال شروع طبابت (شمسی)", null=True, blank=True)

    # consultation types (in-person comes from offices; online types are phase 2)
    offers_phone = models.BooleanField("مشاوره تلفنی", default=False)
    offers_text = models.BooleanField("مشاوره متنی", default=False)
    offers_video = models.BooleanField("مشاوره ویدیویی", default=False)
    offers_instant = models.BooleanField("مشاوره فوری", default=False)
    is_online_now = models.BooleanField("آنلاین برای مشاوره فوری", default=False)
    online_seen_at = models.DateTimeField("آخرین حضور آنلاین", null=True, blank=True)

    verification_status = models.CharField(
        "وضعیت احراز", max_length=16, choices=VerificationStatus.choices, default=VerificationStatus.DRAFT, db_index=True
    )
    rejection_reason = models.CharField("دلیل رد", max_length=255, blank=True)
    is_active = models.BooleanField("نمایش در سایت", default=True)

    # cached stats (refreshed by apps.reviews.services.refresh_doctor_stats)
    rating_avg = models.DecimalField("میانگین امتیاز", max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField("تعداد نظر", default=0)
    recommend_pct = models.PositiveSmallIntegerField("درصد پیشنهاد", default=0)
    avg_wait_minutes = models.PositiveSmallIntegerField("میانگین معطلی (دقیقه)", null=True, blank=True)
    successful_appointments = models.PositiveIntegerField("نوبت موفق", default=0)
    endorsement_count = models.PositiveIntegerField("تأیید همکاران", default=0)
    popularity = models.FloatField("امتیاز محبوبیت", default=0, db_index=True)
    first_free_slot_at = models.DateTimeField("اولین نوبت آزاد", null=True, blank=True, db_index=True)
    first_online_slot_at = models.DateTimeField("اولین زمان مشاوره آنلاین", null=True, blank=True, db_index=True)
    search_text = models.TextField(blank=True, editable=False)

    class Meta:
        ordering = ["-popularity"]
        verbose_name = "پزشک"
        verbose_name_plural = "پزشکان"

    def __str__(self):
        return self.full_name

    @property
    def full_name(self):
        return f"دکتر {self.first_name} {self.last_name}"

    @property
    def is_public(self):
        return self.is_active and self.verification_status == VerificationStatus.APPROVED

    @property
    def available_now(self):
        """Ready for an instant consultation: toggled online and seen in the last few minutes."""
        from datetime import timedelta

        from django.utils import timezone

        return bool(
            self.offers_instant and self.is_online_now and self.online_seen_at
            and self.online_seen_at > timezone.now() - timedelta(minutes=5)
        )

    def build_search_text(self):
        parts = [self.first_name, self.last_name, self.medical_council_no]
        if self.pk:
            parts += [s.name for s in self.specialties.all()]
            parts += [s.title for s in self.specialties.all()]
        return normalize_fa(" ".join(parts))

    def save(self, *args, **kwargs):
        if not self.short_id:
            sid = generate_short_id()
            while DoctorProfile.objects.filter(short_id=sid).exists():
                sid = generate_short_id()
            self.short_id = sid
        self.slug = slugify_fa(f"دکتر {self.first_name} {self.last_name}")
        self.search_text = self.build_search_text()
        super().save(*args, **kwargs)


class DoctorDocument(TimeStampedModel):
    class Kind(models.TextChoices):
        COUNCIL_CARD = "council_card", "کارت نظام پزشکی"
        NATIONAL_CARD = "national_card", "کارت ملی"
        DEGREE = "degree", "مدرک تحصیلی"
        OFFICE_LICENSE = "office_license", "پروانه مطب"
        OTHER = "other", "سایر"

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="documents")
    kind = models.CharField("نوع", max_length=32, choices=Kind.choices)
    file = models.FileField("فایل", upload_to="doctor-docs/")

    class Meta:
        verbose_name = "مدرک پزشک"
        verbose_name_plural = "مدارک پزشکان"


class Office(TimeStampedModel):
    """محل طبابت: مطب شخصی یا حضور در یک مرکز درمانی."""

    doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="offices")
    center = models.ForeignKey(
        "centers.Center", on_delete=models.SET_NULL, null=True, blank=True, related_name="doctor_offices"
    )
    title = models.CharField("عنوان", max_length=128, default="مطب")
    city = models.ForeignKey("geo.City", on_delete=models.PROTECT, related_name="offices", verbose_name="شهر")
    address = models.CharField("آدرس", max_length=400)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    phone = models.CharField("تلفن", max_length=32, blank=True)
    insurances = models.ManyToManyField("catalog.Insurance", blank=True, verbose_name="بیمه‌های طرف قرارداد")
    visit_fee = models.PositiveIntegerField("هزینه ویزیت (تومان)", default=0)
    booking_fee = models.PositiveIntegerField("پیش‌پرداخت آنلاین (تومان)", default=0)
    booking_enabled = models.BooleanField("نوبت‌دهی آنلاین فعال", default=True)
    notes = models.CharField("توضیحات برای بیمار", max_length=400, blank=True)
    is_active = models.BooleanField("فعال", default=True)

    class Meta:
        verbose_name = "مطب"
        verbose_name_plural = "مطب‌ها"

    def __str__(self):
        return f"{self.doctor} - {self.title}"


class Endorsement(TimeStampedModel):
    """تأیید یک پزشک توسط پزشک همکار."""

    from_doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="endorsements_given")
    to_doctor = models.ForeignKey(DoctorProfile, on_delete=models.CASCADE, related_name="endorsements_received")

    class Meta:
        unique_together = [("from_doctor", "to_doctor")]
        verbose_name = "تأیید همکار"
        verbose_name_plural = "تأییدهای همکاران"
