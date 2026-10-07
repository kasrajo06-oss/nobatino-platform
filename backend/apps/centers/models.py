from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.utils import generate_short_id, normalize_fa, slugify_fa
from apps.doctors.models import VerificationStatus


class CenterType(models.TextChoices):
    HOSPITAL = "hospital", "بیمارستان"
    CLINIC = "clinic", "کلینیک"
    DARMANGAH = "darmangah", "درمانگاه"
    LABORATORY = "laboratory", "آزمایشگاه"
    IMAGING = "imaging", "مرکز تصویربرداری"
    PHARMACY = "pharmacy", "داروخانه"


class Center(TimeStampedModel):
    type = models.CharField("نوع", max_length=16, choices=CenterType.choices, db_index=True)
    name = models.CharField("نام", max_length=200)
    slug = models.SlugField("اسلاگ", max_length=220, unique=True, allow_unicode=True, blank=True)
    city = models.ForeignKey("geo.City", on_delete=models.PROTECT, related_name="centers", verbose_name="شهر")
    address = models.CharField("آدرس", max_length=400)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    phone = models.CharField("تلفن", max_length=64, blank=True)
    website = models.URLField("وب‌سایت", blank=True)
    description = models.TextField("درباره مرکز", blank=True)
    logo = models.ImageField(upload_to="centers/logo/", blank=True)
    cover = models.ImageField(upload_to="centers/cover/", blank=True)
    insurances = models.ManyToManyField("catalog.Insurance", blank=True, verbose_name="بیمه‌ها")
    specialties = models.ManyToManyField("catalog.Specialty", blank=True, verbose_name="بخش‌ها/تخصص‌ها")
    working_hours = models.CharField("ساعات کاری", max_length=255, blank=True)
    is_24h = models.BooleanField("شبانه‌روزی", default=False)
    is_public_sector = models.BooleanField("دولتی", default=False)
    has_home_sampling = models.BooleanField("نمونه‌گیری در منزل", default=False)
    online_reception = models.BooleanField("پذیرش آنلاین", default=False)
    reception_fee = models.PositiveIntegerField("هزینه رزرو پذیرش (تومان)", default=0)
    home_sampling_fee = models.PositiveIntegerField("هزینه نمونه‌گیری در منزل (تومان)", default=0)
    verification_status = models.CharField(
        max_length=16, choices=VerificationStatus.choices, default=VerificationStatus.DRAFT, db_index=True
    )
    rejection_reason = models.CharField(max_length=255, blank=True)
    is_active = models.BooleanField("نمایش در سایت", default=True)
    rating_avg = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)
    first_free_slot_at = models.DateTimeField(null=True, blank=True)
    search_text = models.TextField(blank=True, editable=False)

    class Meta:
        ordering = ["-review_count", "name"]
        verbose_name = "مرکز درمانی"
        verbose_name_plural = "مراکز درمانی"

    def __str__(self):
        return self.name

    @property
    def is_public(self):
        return self.is_active and self.verification_status == VerificationStatus.APPROVED

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify_fa(f"{self.get_type_display()} {self.name}")[:200]
            slug = base
            while Center.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base}-{generate_short_id(4).lower()}"
            self.slug = slug
        self.search_text = normalize_fa(f"{self.get_type_display()} {self.name}")
        super().save(*args, **kwargs)


class CenterStaff(TimeStampedModel):
    class Role(models.TextChoices):
        MANAGER = "manager", "مدیر"
        RECEPTION = "reception", "پذیرش"

    center = models.ForeignKey(Center, on_delete=models.CASCADE, related_name="staff")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="center_memberships")
    role = models.CharField(max_length=16, choices=Role.choices, default=Role.MANAGER)

    class Meta:
        unique_together = [("center", "user")]
        verbose_name = "کارمند مرکز"
        verbose_name_plural = "کارمندان مراکز"
