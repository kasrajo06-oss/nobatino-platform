from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel
from apps.core.utils import normalize_fa


class PackageCategory(models.TextChoices):
    DENTISTRY = "dentistry", "دندانپزشکی"
    BEAUTY = "beauty", "پوست، مو و زیبایی"
    PSYCHOLOGY = "psychology", "روانشناسی و مشاوره"
    CHECKUP = "checkup", "چکاپ و آزمایش"
    PHYSIO = "physio", "فیزیوتراپی و توانبخشی"
    NUTRITION = "nutrition", "تغذیه و لاغری"
    OTHER = "other", "سایر خدمات"


class ServicePackage(TimeStampedModel):
    """A fixed-price service sold online (like a voucher), redeemed at the doctor's office or the center."""

    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار تأیید"
        APPROVED = "approved", "تأیید شده"
        REJECTED = "rejected", "رد شده"

    title = models.CharField("عنوان", max_length=200)
    slug = models.SlugField(max_length=220, unique=True, allow_unicode=True)
    category = models.CharField("دسته", max_length=16, choices=PackageCategory.choices, db_index=True)
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.CASCADE, null=True, blank=True, related_name="packages")
    center = models.ForeignKey("centers.Center", on_delete=models.CASCADE, null=True, blank=True, related_name="packages")
    city = models.ForeignKey("geo.City", on_delete=models.PROTECT, related_name="packages", verbose_name="شهر")
    address = models.CharField("محل ارائه خدمت", max_length=400)
    cover = models.ImageField("تصویر", upload_to="packages/", blank=True)
    summary = models.CharField("خلاصه", max_length=300)
    description = models.TextField("توضیحات")
    includes = models.TextField("شامل این خدمات (هر خط یک مورد)", blank=True)
    terms = models.TextField("شرایط استفاده", blank=True)
    original_price = models.PositiveIntegerField("قیمت اصلی (تومان)")
    price = models.PositiveIntegerField("قیمت با تخفیف (تومان)")
    valid_days = models.PositiveSmallIntegerField("اعتبار پس از خرید (روز)", default=90)
    capacity = models.PositiveIntegerField("ظرفیت کل", null=True, blank=True)
    max_per_user = models.PositiveSmallIntegerField("حداکثر خرید هر کاربر", default=3)
    sold_count = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField("فعال", default=True)
    search_text = models.TextField(blank=True, editable=False)

    class Meta:
        ordering = ["-sold_count", "-created_at"]
        verbose_name = "پکیج خدمت"
        verbose_name_plural = "پکیج‌های خدمات"
        constraints = [
            models.CheckConstraint(
                condition=Q(doctor__isnull=False, center__isnull=True) | Q(doctor__isnull=True, center__isnull=False),
                name="package_one_provider",
            ),
            models.CheckConstraint(condition=Q(price__lte=models.F("original_price")), name="package_price_le_original"),
        ]

    def __str__(self):
        return self.title

    @property
    def discount_percent(self):
        return round(100 * (self.original_price - self.price) / self.original_price) if self.original_price else 0

    @property
    def provider_name(self):
        return self.doctor.full_name if self.doctor_id else self.center.name

    @property
    def remaining(self):
        return None if self.capacity is None else max(0, self.capacity - self.sold_count)

    def save(self, *args, **kwargs):
        self.search_text = normalize_fa(f"{self.title} {self.summary} {self.get_category_display()}")
        super().save(*args, **kwargs)


class PackageOrder(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING_PAYMENT = "pending_payment", "در انتظار پرداخت"
        PAID = "paid", "قابل استفاده"
        USED = "used", "استفاده شده"
        CANCELLED = "cancelled", "لغو و مسترد شده"
        EXPIRED = "expired", "منقضی"

    package = models.ForeignKey(ServicePackage, on_delete=models.PROTECT, related_name="orders")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="package_orders")
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING_PAYMENT, db_index=True)
    voucher_code = models.CharField("کد استفاده", max_length=10, unique=True)
    price = models.PositiveIntegerField()
    paid_amount = models.PositiveIntegerField(default=0)
    refunded_amount = models.PositiveIntegerField(default=0)
    held_until = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField("مهلت استفاده", null=True, blank=True)
    used_at = models.DateTimeField(null=True, blank=True)
    redeemed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+")
    buyer_name = models.CharField(max_length=128)
    buyer_mobile = models.CharField(max_length=11)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "خرید پکیج"
        verbose_name_plural = "خریدهای پکیج"

    def __str__(self):
        return f"{self.voucher_code} - {self.package}"
