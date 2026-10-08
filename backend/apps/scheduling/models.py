from django.conf import settings
from django.db import models
from django.db.models import Q

from apps.core.models import TimeStampedModel

WEEKDAYS = [(0, "شنبه"), (1, "یکشنبه"), (2, "دوشنبه"), (3, "سه‌شنبه"), (4, "چهارشنبه"), (5, "پنجشنبه"), (6, "جمعه")]


def persian_weekday(d):
    """Saturday=0 ... Friday=6."""
    return (d.weekday() + 2) % 7


class AppointmentKind(models.TextChoices):
    IN_PERSON = "in_person", "نوبت مطب"
    LAB = "lab", "پذیرش آزمایشگاه/مرکز"
    PHONE = "phone", "مشاوره تلفنی"
    TEXT = "text", "مشاوره متنی"
    VIDEO = "video", "مشاوره ویدیویی"
    # Slot-only kind: a doctor's online time that can be booked as a phone or video consultation
    ONLINE = "online", "زمان مشاوره آنلاین"


class _OwnedByOfficeOrCenter(models.Model):
    office = models.ForeignKey("doctors.Office", on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    center = models.ForeignKey("centers.Center", on_delete=models.CASCADE, null=True, blank=True, related_name="+")
    # online-consultation schedule of a doctor (not tied to an office)
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.CASCADE, null=True, blank=True, related_name="+")

    class Meta:
        abstract = True

    @property
    def owner(self):
        return self.office or self.center or self.doctor


_ONE_OWNER = (
    Q(office__isnull=False, center__isnull=True, doctor__isnull=True)
    | Q(office__isnull=True, center__isnull=False, doctor__isnull=True)
    | Q(office__isnull=True, center__isnull=True, doctor__isnull=False)
)


class WeeklySchedule(_OwnedByOfficeOrCenter, TimeStampedModel):
    weekday = models.PositiveSmallIntegerField("روز هفته", choices=WEEKDAYS)
    start_time = models.TimeField("از ساعت")
    end_time = models.TimeField("تا ساعت")
    slot_minutes = models.PositiveSmallIntegerField("مدت هر نوبت (دقیقه)", default=15)
    capacity = models.PositiveSmallIntegerField("ظرفیت هر نوبت", default=1)
    kind = models.CharField(max_length=16, choices=AppointmentKind.choices, default=AppointmentKind.IN_PERSON)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["weekday", "start_time"]
        verbose_name = "برنامه هفتگی"
        verbose_name_plural = "برنامه‌های هفتگی"
        constraints = [
            models.CheckConstraint(condition=_ONE_OWNER, name="schedule_one_owner"),
            models.CheckConstraint(condition=Q(end_time__gt=models.F("start_time")), name="schedule_valid_range"),
        ]


class ScheduleException(_OwnedByOfficeOrCenter, TimeStampedModel):
    """مرخصی/تعطیلی. اگر ساعت خالی باشد کل روز بسته است."""

    date = models.DateField("تاریخ")
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    reason = models.CharField("دلیل", max_length=200, blank=True)

    class Meta:
        ordering = ["date"]
        verbose_name = "مرخصی/تعطیلی"
        verbose_name_plural = "مرخصی‌ها و تعطیلی‌ها"
        constraints = [models.CheckConstraint(condition=_ONE_OWNER, name="exception_one_owner")]


class Slot(_OwnedByOfficeOrCenter):
    start = models.DateTimeField(db_index=True)
    end = models.DateTimeField()
    capacity = models.PositiveSmallIntegerField(default=1)
    booked_count = models.PositiveSmallIntegerField(default=0)
    kind = models.CharField(max_length=16, choices=AppointmentKind.choices, default=AppointmentKind.IN_PERSON)
    is_blocked = models.BooleanField(default=False)

    class Meta:
        ordering = ["start"]
        constraints = [
            models.CheckConstraint(condition=_ONE_OWNER, name="slot_one_owner"),
            models.UniqueConstraint(fields=["office", "start", "kind"], name="uniq_office_slot"),
            models.UniqueConstraint(fields=["center", "start", "kind"], name="uniq_center_slot"),
            models.UniqueConstraint(fields=["doctor", "start", "kind"], name="uniq_doctor_slot"),
        ]

    @property
    def is_available(self):
        return not self.is_blocked and self.booked_count < self.capacity


class AppointmentStatus(models.TextChoices):
    PENDING_PAYMENT = "pending_payment", "در انتظار پرداخت"
    CONFIRMED = "confirmed", "قطعی"
    ATTENDED = "attended", "مراجعه شد"
    NO_SHOW = "no_show", "عدم مراجعه"
    CANCELLED = "cancelled", "لغو شده"
    EXPIRED = "expired", "منقضی"


ACTIVE_STATUSES = [AppointmentStatus.PENDING_PAYMENT, AppointmentStatus.CONFIRMED]


class Appointment(TimeStampedModel):
    tracking_code = models.CharField("کد پیگیری", max_length=12, unique=True)
    kind = models.CharField(max_length=16, choices=AppointmentKind.choices, default=AppointmentKind.IN_PERSON)
    status = models.CharField(max_length=20, choices=AppointmentStatus.choices, db_index=True)
    slot = models.ForeignKey(Slot, on_delete=models.PROTECT, null=True, blank=True, related_name="appointments")
    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, null=True, blank=True, related_name="appointments")
    office = models.ForeignKey("doctors.Office", on_delete=models.PROTECT, null=True, blank=True, related_name="appointments")
    center = models.ForeignKey("centers.Center", on_delete=models.PROTECT, null=True, blank=True, related_name="appointments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="appointments")
    family_member = models.ForeignKey("accounts.FamilyMember", on_delete=models.SET_NULL, null=True, blank=True)
    # snapshot of patient identity at booking time
    patient_name = models.CharField("نام بیمار", max_length=128)
    patient_national_code = models.CharField("کد ملی بیمار", max_length=10)
    patient_mobile = models.CharField("موبایل", max_length=11)
    start = models.DateTimeField("زمان نوبت", db_index=True)
    price = models.PositiveIntegerField("مبلغ قابل پرداخت (تومان)", default=0)
    paid_amount = models.PositiveIntegerField("پرداخت شده", default=0)
    refunded_amount = models.PositiveIntegerField("مسترد شده", default=0)
    held_until = models.DateTimeField(null=True, blank=True)
    patient_note = models.CharField("توضیحات بیمار", max_length=400, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="+"
    )
    cancel_reason = models.CharField(max_length=255, blank=True)
    reminded_24h = models.BooleanField(default=False)
    reminded_2h = models.BooleanField(default=False)

    class Meta:
        ordering = ["-start"]
        verbose_name = "نوبت"
        verbose_name_plural = "نوبت‌ها"

    def __str__(self):
        return f"{self.tracking_code} - {self.patient_name}"

    @property
    def is_online(self):
        return self.kind in (AppointmentKind.PHONE, AppointmentKind.TEXT, AppointmentKind.VIDEO)

    @property
    def provider_name(self):
        if self.doctor_id:
            return self.doctor.full_name
        return self.center.name if self.center_id else ""
