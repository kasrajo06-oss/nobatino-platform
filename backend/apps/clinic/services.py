"""Package purchase lifecycle: order → payment (wallet/gateway) → voucher → redeemed by provider."""
from datetime import timedelta

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from apps.core.utils import generate_short_id
from apps.payments.services import (
    PaymentError,
    credit_wallet,
    debit_wallet,
    get_wallet,
    start_gateway_payment,
)

from .models import PackageOrder, ServicePackage

HOLD_MINUTES = 15


class PackageError(Exception):
    pass


def _voucher():
    while True:
        code = generate_short_id(8).upper()
        if not PackageOrder.objects.filter(voucher_code=code).exists():
            return code


@transaction.atomic
def create_order(user, package: ServicePackage) -> PackageOrder:
    package = ServicePackage.objects.select_for_update().get(pk=package.pk)
    if not (package.is_active and package.status == ServicePackage.Status.APPROVED):
        raise PackageError("این پکیج در حال حاضر قابل خرید نیست.")
    if package.remaining == 0:
        raise PackageError("ظرفیت این پکیج تکمیل شده است.")
    active = PackageOrder.objects.filter(user=user, package=package, status__in=["pending_payment", "paid", "used"]).count()
    if active >= package.max_per_user:
        raise PackageError(f"حداکثر {package.max_per_user} بار می‌توانید این پکیج را بخرید.")
    if not user.full_name:
        raise PackageError("لطفاً ابتدا نام خود را در پروفایل تکمیل کنید.")
    # an unpaid order for the same package is reused instead of piling up
    existing = PackageOrder.objects.filter(user=user, package=package, status="pending_payment", held_until__gt=timezone.now()).first()
    if existing:
        return existing
    return PackageOrder.objects.create(
        package=package, user=user, voucher_code=_voucher(), price=package.price,
        held_until=timezone.now() + timedelta(minutes=HOLD_MINUTES), buyer_name=user.full_name, buyer_mobile=user.mobile,
    )


@transaction.atomic
def mark_paid(order: PackageOrder, amount: int):
    order = PackageOrder.objects.select_for_update(of=("self",)).select_related("package").get(pk=order.pk)
    if order.status != PackageOrder.Status.PENDING_PAYMENT:
        return order
    now = timezone.now()
    order.status = PackageOrder.Status.PAID
    order.paid_amount = amount
    order.paid_at = now
    order.held_until = None
    order.expires_at = now + timedelta(days=order.package.valid_days)
    order.save()
    ServicePackage.objects.filter(pk=order.package_id).update(sold_count=F("sold_count") + 1)
    from apps.notifications.tasks import send_sms

    transaction.on_commit(lambda: send_sms.delay(
        order.buyer_mobile, f"خرید «{order.package.title}» انجام شد. کد استفاده: {order.voucher_code}", "package_paid",
    ))
    from apps.notifications.inbox import notify, notify_many
    from apps.notifications.models import Notification

    notify(order.user, Notification.Kind.PACKAGE, f"خرید «{order.package.title}» انجام شد", f"کد استفاده: {order.voucher_code}", f"/orders/{order.pk}")
    from apps.accounts.models import User

    pkg = order.package
    providers = [pkg.doctor.user] if pkg.doctor_id else User.objects.filter(center_memberships__center=pkg.center)
    notify_many(
        providers, Notification.Kind.PACKAGE, f"فروش جدید: {pkg.title}", f"خریدار: {order.buyer_name}",
        "/doctor-panel/packages" if pkg.doctor_id else "/center-panel/packages",
    )
    return order


def start_payment(order: PackageOrder, *, use_wallet=True):
    if order.status != PackageOrder.Status.PENDING_PAYMENT:
        raise PaymentError("این خرید نیازی به پرداخت ندارد.")
    if order.held_until and order.held_until < timezone.now():
        raise PaymentError("مهلت پرداخت به پایان رسیده است؛ دوباره خرید کنید.")
    from_wallet = min(get_wallet(order.user).balance, order.price) if use_wallet else 0
    if from_wallet == order.price:
        with transaction.atomic():
            debit_wallet(order.user, from_wallet, kind="payment", description=f"خرید پکیج {order.voucher_code}")
            mark_paid(order, from_wallet)
        return {"status": "paid", "voucher_code": order.voucher_code}
    return start_gateway_payment(
        user=order.user, purpose="package", amount=order.price - from_wallet, wallet_amount=from_wallet,
        description=f"خرید {order.package.title}", package_order=order,
    )


def on_gateway_paid(payment):
    """Called by payments.handle_callback (inside its transaction) after the bank verified a package payment."""
    order = PackageOrder.objects.get(pk=payment.package_order_id)
    wallet_ok = True
    if order.status == PackageOrder.Status.PENDING_PAYMENT and payment.wallet_amount:
        try:
            with transaction.atomic():
                debit_wallet(order.user, payment.wallet_amount, kind="payment", description=f"خرید پکیج {order.voucher_code}")
        except PaymentError:
            wallet_ok = False
    if order.status == PackageOrder.Status.PENDING_PAYMENT and wallet_ok:
        mark_paid(order, payment.amount + payment.wallet_amount)
    else:
        credit_wallet(order.user, payment.amount, kind="refund", description=f"بازگشت وجه خرید {order.voucher_code}")


@transaction.atomic
def cancel_order(order: PackageOrder, *, by_provider=False):
    """Unused vouchers can be cancelled for a full refund to the wallet."""
    order = PackageOrder.objects.select_for_update().get(pk=order.pk)
    if order.status == PackageOrder.Status.PENDING_PAYMENT:
        order.status = PackageOrder.Status.CANCELLED
        order.save(update_fields=["status", "updated_at"])
        return order, 0
    if order.status != PackageOrder.Status.PAID:
        raise PackageError("این خرید قابل لغو نیست.")
    order.status = PackageOrder.Status.CANCELLED
    order.refunded_amount = order.paid_amount
    order.save(update_fields=["status", "refunded_amount", "updated_at"])
    if order.paid_amount:
        credit_wallet(order.user, order.paid_amount, kind="refund", description=f"لغو پکیج {order.voucher_code}")
    ServicePackage.objects.filter(pk=order.package_id, sold_count__gt=0).update(sold_count=F("sold_count") - 1)
    return order, order.paid_amount


@transaction.atomic
def redeem(voucher_code: str, *, provider_user, doctor=None, center=None) -> PackageOrder:
    order = (
        PackageOrder.objects.select_for_update(of=("self",)).select_related("package")
        .filter(voucher_code=voucher_code.strip().upper()).first()
    )
    if not order or (doctor and order.package.doctor_id != doctor.id) or (center and order.package.center_id != center.id):
        raise PackageError("کد معتبر نیست یا مربوط به خدمات شما نیست.")
    if order.status == PackageOrder.Status.USED:
        raise PackageError("این کد قبلاً استفاده شده است.")
    if order.status != PackageOrder.Status.PAID:
        raise PackageError(f"این کد قابل استفاده نیست ({order.get_status_display()}).")
    if order.expires_at and order.expires_at < timezone.now():
        raise PackageError("مهلت استفاده از این کد به پایان رسیده است.")
    order.status = PackageOrder.Status.USED
    order.used_at = timezone.now()
    order.redeemed_by = provider_user
    order.save(update_fields=["status", "used_at", "redeemed_by", "updated_at"])
    from apps.notifications.inbox import notify
    from apps.notifications.models import Notification

    notify(order.user, Notification.Kind.PACKAGE, f"از «{order.package.title}» استفاده شد", "امیدواریم از خدمت راضی باشید.", "/panel/packages")
    return order


def expire_orders():
    now = timezone.now()
    n1 = PackageOrder.objects.filter(status="pending_payment", held_until__lt=now).update(status="expired")
    n2 = PackageOrder.objects.filter(status="paid", expires_at__lt=now).update(status="expired")
    return n1, n2
