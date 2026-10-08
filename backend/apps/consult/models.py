from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.storage import private_storage, validate_upload


class ConsultKind(models.TextChoices):
    PHONE = "phone", "مشاوره تلفنی"
    TEXT = "text", "مشاوره متنی"
    VIDEO = "video", "مشاوره ویدیویی"


class ConsultService(TimeStampedModel):
    """A doctor's online consultation offering and its price."""

    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.CASCADE, related_name="consult_services")
    kind = models.CharField("نوع", max_length=8, choices=ConsultKind.choices)
    price = models.PositiveIntegerField("هزینه (تومان)")
    duration_minutes = models.PositiveSmallIntegerField("مدت تماس (دقیقه)", default=15)
    instant_enabled = models.BooleanField("امکان مشاوره فوری", default=False)
    is_active = models.BooleanField("فعال", default=True)

    class Meta:
        unique_together = [("doctor", "kind")]
        ordering = ["kind"]
        verbose_name = "خدمت مشاوره آنلاین"
        verbose_name_plural = "خدمات مشاوره آنلاین"

    def __str__(self):
        return f"{self.doctor} - {self.get_kind_display()}"


class Consultation(TimeStampedModel):
    """Online consultation details attached to an Appointment (kind phone/text/video)."""

    class State(models.TextChoices):
        WAITING = "waiting", "در انتظار پزشک"
        ACTIVE = "active", "در حال مشاوره"
        CLOSED = "closed", "پایان یافته"

    appointment = models.OneToOneField("scheduling.Appointment", on_delete=models.CASCADE, related_name="consultation")
    kind = models.CharField(max_length=8, choices=ConsultKind.choices)
    is_instant = models.BooleanField("فوری", default=False)
    complaint = models.TextField("شرح حال و سؤال بیمار")
    state = models.CharField(max_length=8, choices=State.choices, default=State.WAITING, db_index=True)
    doctor_deadline = models.DateTimeField("مهلت پاسخ پزشک", null=True, blank=True)
    started_at = models.DateTimeField(null=True, blank=True)
    closes_at = models.DateTimeField("بسته شدن خودکار", null=True, blank=True)
    closed_at = models.DateTimeField(null=True, blank=True)
    doctor_summary = models.TextField("جمع‌بندی و توصیه پزشک", blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "مشاوره آنلاین"
        verbose_name_plural = "مشاوره‌های آنلاین"

    def __str__(self):
        return f"{self.get_kind_display()} {self.appointment.tracking_code}"

    def is_participant(self, user):
        appt = self.appointment
        return user.is_authenticated and (appt.user_id == user.id or (appt.doctor_id and appt.doctor.user_id == user.id))

    def is_doctor(self, user):
        return self.appointment.doctor.user_id == user.id


class ConsultMessage(models.Model):
    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    from_doctor = models.BooleanField(default=False)
    is_system = models.BooleanField(default=False)
    text = models.TextField(blank=True)
    file = models.FileField(upload_to="consult-files/", blank=True, storage=private_storage, validators=[validate_upload])
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["id"]
        verbose_name = "پیام مشاوره"
        verbose_name_plural = "پیام‌های مشاوره"


class CallSignal(models.Model):
    """WebRTC signaling messages exchanged through the API (polling); kept short-lived."""

    class Kind(models.TextChoices):
        RING = "ring", "درخواست تماس"
        OFFER = "offer", "offer"
        ANSWER = "answer", "answer"
        CANDIDATE = "candidate", "candidate"
        HANGUP = "hangup", "پایان تماس"
        DECLINE = "decline", "رد تماس"

    consultation = models.ForeignKey(Consultation, on_delete=models.CASCADE, related_name="signals")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    kind = models.CharField(max_length=12, choices=Kind.choices)
    payload = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["id"]
