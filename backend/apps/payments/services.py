from django.conf import settings
from django.db import transaction
from django.db.models import Q, Sum
from django.utils import timezone

from apps.scheduling.models import Appointment, AppointmentStatus
from apps.scheduling.services import BookingError, confirm_payment

from .gateways import GatewayError, get_gateway
from .models import Payment, Settlement, Wallet, WalletTransaction


class PaymentError(Exception):
    pass


def get_wallet(user, lock=False):
    wallet, _ = Wallet.objects.get_or_create(user=user)
    if lock:
        wallet = Wallet.objects.select_for_update().get(pk=wallet.pk)
    return wallet


@transaction.atomic
def credit_wallet(user, amount, *, kind, appointment=None, description=""):
    wallet = get_wallet(user, lock=True)
    wallet.balance += amount
    wallet.save(update_fields=["balance", "updated_at"])
    WalletTransaction.objects.create(
        wallet=wallet, amount=amount, balance_after=wallet.balance, kind=kind, appointment=appointment, description=description
    )
    return wallet


@transaction.atomic
def debit_wallet(user, amount, *, kind, appointment=None, description=""):
    wallet = get_wallet(user, lock=True)
    if wallet.balance < amount:
        raise PaymentError("موجودی کیف پول کافی نیست.")
    wallet.balance -= amount
    wallet.save(update_fields=["balance", "updated_at"])
    WalletTransaction.objects.create(
        wallet=wallet, amount=-amount, balance_after=wallet.balance, kind=kind, appointment=appointment, description=description
    )
    return wallet


def start_appointment_payment(appt: Appointment, *, use_wallet: bool):
    """Returns dict: either {"status": "paid"} (wallet covered it) or {"redirect_url": ...}."""
    if appt.status != AppointmentStatus.PENDING_PAYMENT:
        raise PaymentError("این نوبت نیازی به پرداخت ندارد.")
    if appt.held_until and appt.held_until < timezone.now():
        raise PaymentError("مهلت پرداخت این نوبت به پایان رسیده است.")

    wallet_balance = get_wallet(appt.user).balance if use_wallet else 0
    from_wallet = min(wallet_balance, appt.price)
    remaining = appt.price - from_wallet

    if remaining == 0:
        with transaction.atomic():
            debit_wallet(appt.user, from_wallet, kind="payment", appointment=appt, description=f"نوبت {appt.tracking_code}")
            confirm_payment(appt, from_wallet)
        return {"status": "paid", "tracking_code": appt.tracking_code}

    gateway = get_gateway()
    payment = Payment.objects.create(
        user=appt.user,
        purpose=Payment.Purpose.APPOINTMENT,
        appointment=appt,
        amount=remaining,
        wallet_amount=from_wallet,
        gateway=gateway.name,
    )
    callback = f"{settings.API_URL}/api/payments/callback/?pid={payment.pk}"
    try:
        authority, url = gateway.request(remaining, f"رزرو نوبت {appt.tracking_code}", callback, appt.user.mobile)
    except GatewayError as e:
        payment.status, payment.error = Payment.Status.FAILED, str(e)
        payment.save()
        raise PaymentError(str(e)) from e
    payment.authority, payment.status = authority, Payment.Status.REDIRECTED
    payment.save(update_fields=["authority", "status", "updated_at"])
    return {"redirect_url": url, "payment_id": payment.pk}


def start_wallet_topup(user, amount: int):
    if amount < 10_000:
        raise PaymentError("حداقل مبلغ شارژ ۱۰٬۰۰۰ تومان است.")
    gateway = get_gateway()
    payment = Payment.objects.create(user=user, purpose=Payment.Purpose.WALLET_TOPUP, amount=amount, gateway=gateway.name)
    callback = f"{settings.API_URL}/api/payments/callback/?pid={payment.pk}"
    authority, url = gateway.request(amount, "افزایش موجودی کیف پول", callback, user.mobile)
    payment.authority, payment.status = authority, Payment.Status.REDIRECTED
    payment.save(update_fields=["authority", "status", "updated_at"])
    return {"redirect_url": url, "payment_id": payment.pk}


def handle_callback(payment_id, authority, status_ok: bool) -> Payment:
    with transaction.atomic():
        payment = Payment.objects.select_for_update().get(pk=payment_id, authority=authority)
        if payment.status in (Payment.Status.PAID, Payment.Status.FAILED):
            return payment
        if not status_ok:
            payment.status, payment.error = Payment.Status.FAILED, "پرداخت توسط کاربر لغو شد."
            payment.save()
            return payment
        result = get_gateway().verify(authority, payment.amount)
        if not result.ok:
            payment.status, payment.error = Payment.Status.FAILED, result.error
            payment.save()
            return payment
        payment.status, payment.ref_id, payment.card_pan, payment.paid_at = (
            Payment.Status.PAID, result.ref_id, result.card_pan, timezone.now(),
        )
        payment.save()

        if payment.purpose == Payment.Purpose.WALLET_TOPUP:
            credit_wallet(payment.user, payment.amount, kind="topup", description=f"شارژ - کد رهگیری {result.ref_id}")
            return payment

        appt = payment.appointment
        appt.refresh_from_db()
        wallet_ok = True
        if appt.status == AppointmentStatus.PENDING_PAYMENT and payment.wallet_amount:
            try:
                with transaction.atomic():
                    debit_wallet(appt.user, payment.wallet_amount, kind="payment", appointment=appt, description=f"نوبت {appt.tracking_code}")
            except PaymentError:
                wallet_ok = False
        if appt.status == AppointmentStatus.PENDING_PAYMENT and wallet_ok:
            confirm_payment(appt, payment.amount + payment.wallet_amount)
        else:
            # hold expired before the bank returned: money goes to the wallet instead of being lost
            credit_wallet(appt.user, payment.amount, kind="refund", appointment=appt, description="بازگشت وجه نوبت منقضی‌شده")
    return payment


def provider_balance(*, doctor=None, center=None):
    """Earnings from paid appointments minus platform commission minus settlements."""
    flt = Q(doctor=doctor) if doctor else Q(center=center)
    earned_statuses = [AppointmentStatus.CONFIRMED, AppointmentStatus.ATTENDED, AppointmentStatus.NO_SHOW]
    gross = (
        Appointment.objects.filter(flt, status__in=earned_statuses).aggregate(s=Sum("paid_amount"))["s"] or 0
    )
    commission = gross * settings.PLATFORM_COMMISSION_PERCENT // 100
    settled = (
        Settlement.objects.filter(flt, status__in=[Settlement.Status.REQUESTED, Settlement.Status.PAID]).aggregate(
            s=Sum("amount")
        )["s"]
        or 0
    )
    return {"gross": gross, "commission": commission, "net": gross - commission, "settled": settled, "available": gross - commission - settled}


__all__ = ["BookingError", "PaymentError", "credit_wallet", "debit_wallet", "provider_balance"]
