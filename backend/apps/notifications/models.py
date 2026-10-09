from django.conf import settings
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


class Notification(models.Model):
    """In-app notification shown under the bell icon (and as toast / desktop notification)."""

    class Kind(models.TextChoices):
        CONSULT_REQUEST = "consult_request", "درخواست مشاوره جدید"
        CONSULT_STARTED = "consult_started", "شروع مشاوره"
        CONSULT_MESSAGE = "consult_message", "پیام جدید"
        CONSULT_CLOSED = "consult_closed", "پایان مشاوره"
        CALL_INCOMING = "call_incoming", "تماس ورودی"
        CALL_MISSED = "call_missed", "تماس بی‌پاسخ"
        APPOINTMENT_CONFIRMED = "appointment_confirmed", "نوبت ثبت شد"
        APPOINTMENT_NEW = "appointment_new", "نوبت جدید"
        APPOINTMENT_CANCELLED = "appointment_cancelled", "لغو نوبت"
        REMINDER = "reminder", "یادآوری"
        LAB_RESULT = "lab_result", "جواب آزمایش"
        PACKAGE = "package", "پکیج خدمات"
        REVIEW = "review", "نظر"
        ACCOUNT = "account", "حساب کاربری"
        FINANCE = "finance", "مالی"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    kind = models.CharField(max_length=32, choices=Kind.choices, db_index=True)
    title = models.CharField(max_length=150)
    body = models.CharField(max_length=300, blank=True)
    link = models.CharField(max_length=300, blank=True, db_index=True)
    count = models.PositiveIntegerField(default=1)
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read", "-created_at"])]
        verbose_name = "اعلان"
        verbose_name_plural = "اعلان‌ها"

    def __str__(self):
        return f"{self.user} - {self.title}"
