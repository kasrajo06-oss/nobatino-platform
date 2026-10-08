from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.storage import private_storage, validate_upload


class LabTest(models.Model):
    name = models.CharField("نام آزمایش", max_length=200, unique=True)
    en_name = models.CharField("نام انگلیسی/اختصار", max_length=120, blank=True)
    slug = models.SlugField(max_length=200, unique=True, allow_unicode=True)
    category = models.CharField("دسته", max_length=100, blank=True)
    preparation = models.TextField("شرایط آمادگی", blank=True)
    fasting_hours = models.PositiveSmallIntegerField("ساعت ناشتایی", default=0)
    result_days = models.PositiveSmallIntegerField("زمان جوابدهی (روز)", default=1)

    class Meta:
        ordering = ["category", "name"]
        verbose_name = "آزمایش"
        verbose_name_plural = "آزمایش‌ها"

    def __str__(self):
        return self.name


class CenterLabTest(models.Model):
    center = models.ForeignKey("centers.Center", on_delete=models.CASCADE, related_name="lab_tests")
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name="center_prices")
    price = models.PositiveIntegerField("قیمت آزاد (تومان)", default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        unique_together = [("center", "test")]
        verbose_name = "قیمت آزمایش مرکز"
        verbose_name_plural = "قیمت آزمایش‌های مراکز"


class LabReception(TimeStampedModel):
    """جزئیات پذیرش آنلاین آزمایشگاه که به یک نوبت (Appointment.kind=lab) متصل است."""

    class Status(models.TextChoices):
        BOOKED = "booked", "رزرو شده"
        SAMPLED = "sampled", "نمونه‌گیری شد"
        RESULT_READY = "result_ready", "جواب آماده است"

    appointment = models.OneToOneField("scheduling.Appointment", on_delete=models.CASCADE, related_name="lab_reception")
    tests = models.ManyToManyField(LabTest, blank=True, verbose_name="آزمایش‌ها")
    prescription = models.FileField("تصویر نسخه", upload_to="prescriptions/", blank=True, storage=private_storage, validators=[validate_upload])
    has_insurance_prescription = models.BooleanField("نسخه بیمه دارد", default=False)
    home_sampling = models.BooleanField("نمونه‌گیری در منزل", default=False)
    home_address = models.CharField("آدرس نمونه‌گیری", max_length=400, blank=True)
    estimated_price = models.PositiveIntegerField("برآورد هزینه آزمایش‌ها", default=0)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.BOOKED)
    result_file = models.FileField("فایل جواب", upload_to="lab-results/", blank=True, storage=private_storage, validators=[validate_upload])

    class Meta:
        verbose_name = "پذیرش آزمایشگاه"
        verbose_name_plural = "پذیرش‌های آزمایشگاه"
