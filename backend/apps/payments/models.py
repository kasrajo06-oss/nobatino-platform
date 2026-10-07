from django.conf import settings
from django.db import models

from apps.core.models import TimeStampedModel


class Wallet(TimeStampedModel):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet")
    balance = models.BigIntegerField("موجودی (تومان)", default=0)

    class Meta:
        verbose_name = "کیف پول"
        verbose_name_plural = "کیف پول‌ها"


class WalletTransaction(TimeStampedModel):
    class Kind(models.TextChoices):
        TOPUP = "topup", "افزایش موجودی"
        PAYMENT = "payment", "پرداخت نوبت"
        REFUND = "refund", "استرداد"
        ADJUST = "adjust", "اصلاح توسط پشتیبانی"

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    amount = models.BigIntegerField("مبلغ (+/-)")
    balance_after = models.BigIntegerField()
    kind = models.CharField(max_length=16, choices=Kind.choices)
    appointment = models.ForeignKey("scheduling.Appointment", on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "تراکنش کیف پول"
        verbose_name_plural = "تراکنش‌های کیف پول"


class Payment(TimeStampedModel):
    class Status(models.TextChoices):
        INIT = "init", "ایجاد شده"
        REDIRECTED = "redirected", "ارسال به درگاه"
        PAID = "paid", "موفق"
        FAILED = "failed", "ناموفق"

    class Purpose(models.TextChoices):
        APPOINTMENT = "appointment", "پرداخت نوبت"
        WALLET_TOPUP = "wallet_topup", "شارژ کیف پول"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="payments")
    purpose = models.CharField(max_length=16, choices=Purpose.choices)
    appointment = models.ForeignKey("scheduling.Appointment", on_delete=models.SET_NULL, null=True, blank=True, related_name="payments")
    amount = models.PositiveIntegerField("مبلغ درگاه (تومان)")
    wallet_amount = models.PositiveIntegerField("مبلغ از کیف پول", default=0)
    gateway = models.CharField(max_length=32)
    authority = models.CharField(max_length=128, blank=True, db_index=True)
    ref_id = models.CharField("کد رهگیری بانک", max_length=64, blank=True)
    card_pan = models.CharField(max_length=32, blank=True)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.INIT, db_index=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    error = models.CharField(max_length=255, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "پرداخت"
        verbose_name_plural = "پرداخت‌ها"


class Settlement(TimeStampedModel):
    class Status(models.TextChoices):
        REQUESTED = "requested", "درخواست شده"
        PAID = "paid", "واریز شد"
        REJECTED = "rejected", "رد شد"

    doctor = models.ForeignKey("doctors.DoctorProfile", on_delete=models.PROTECT, null=True, blank=True, related_name="settlements")
    center = models.ForeignKey("centers.Center", on_delete=models.PROTECT, null=True, blank=True, related_name="settlements")
    amount = models.PositiveIntegerField("مبلغ (تومان)")
    iban = models.CharField("شماره شبا", max_length=26)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.REQUESTED, db_index=True)
    bank_ref = models.CharField("کد پیگیری واریز", max_length=64, blank=True)
    note = models.CharField(max_length=255, blank=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "تسویه"
        verbose_name_plural = "تسویه‌ها"
