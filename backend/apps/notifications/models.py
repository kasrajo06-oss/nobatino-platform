from django.db import models

from apps.core.models import TimeStampedModel


class SmsLog(TimeStampedModel):
    class Status(models.TextChoices):
        SENT = "sent", "ارسال شد"
        FAILED = "failed", "ناموفق"

    mobile = models.CharField(max_length=11, db_index=True)
    kind = models.CharField(max_length=32)
    text = models.TextField()
    status = models.CharField(max_length=8, choices=Status.choices)
    provider_ref = models.CharField(max_length=64, blank=True)
    error = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "پیامک"
        verbose_name_plural = "لاگ پیامک‌ها"
