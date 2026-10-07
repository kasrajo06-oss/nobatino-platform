from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.core.models import TimeStampedModel


class Review(TimeStampedModel):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار بررسی"
        APPROVED = "approved", "منتشر شده"
        REJECTED = "rejected", "رد شده"

    class Wait(models.IntegerChoices):
        UNDER_15 = 10, "کمتر از ۱۵ دقیقه"
        UNDER_30 = 25, "۱۵ تا ۳۰ دقیقه"
        UNDER_60 = 45, "۳۰ دقیقه تا ۱ ساعت"
        OVER_60 = 75, "بیش از ۱ ساعت"

    appointment = models.OneToOneField("scheduling.Appointment", on_delete=models.CASCADE, related_name="review")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.CASCADE, null=True, blank=True, related_name="reviews")
    center = models.ForeignKey("centers.Center", on_delete=models.CASCADE, null=True, blank=True, related_name="reviews")
    rating = models.PositiveSmallIntegerField("امتیاز", validators=[MinValueValidator(1), MaxValueValidator(5)])
    recommends = models.BooleanField("پیشنهاد می‌کنم", default=True)
    wait_minutes = models.PositiveSmallIntegerField("زمان انتظار", choices=Wait.choices, null=True, blank=True)
    text = models.TextField("متن نظر", blank=True)
    show_name = models.BooleanField("نمایش نام", default=False)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.PENDING, db_index=True)
    reply = models.TextField("پاسخ پزشک/مرکز", blank=True)
    replied_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "نظر"
        verbose_name_plural = "نظرات"

    @property
    def author_display(self):
        if self.show_name and self.user.first_name:
            return f"{self.user.first_name} {self.user.last_name[:1]}."
        return "کاربر"
