"""Slot generation and booking. All booking state changes go through this module."""
from datetime import datetime, timedelta

from django.conf import settings
from django.db import IntegrityError, transaction
from django.db.models import F, Min
from django.utils import timezone

from apps.core.utils import generate_numeric_code

from .models import (
    ACTIVE_STATUSES,
    Appointment,
    AppointmentKind,
    AppointmentStatus,
    ScheduleException,
    Slot,
    WeeklySchedule,
    persian_weekday,
)


class BookingError(Exception):
    pass


def _owner_filter(office=None, center=None):
    return {"office": office, "center": None} if office else {"office": None, "center": center}


def generate_slots(office=None, center=None, days=None, start_date=None):
    """Materialize Slot rows from the weekly schedule for the next `days` days. Idempotent."""
    days = days or settings.SLOT_GENERATION_DAYS
    owner = _owner_filter(office, center)
    tz = timezone.get_current_timezone()
    today = start_date or timezone.localdate()
    schedules = list(WeeklySchedule.objects.filter(is_active=True, **owner))
    exceptions = list(ScheduleException.objects.filter(date__gte=today, date__lt=today + timedelta(days=days), **owner))
    now = timezone.now()
    existing = {(s.start, s.kind): s for s in Slot.objects.filter(start__gt=now, **owner)}
    to_create: list[Slot] = []
    to_update: list[Slot] = []

    wanted: set[tuple] = set()
    for i in range(days):
        day = today + timedelta(days=i)
        day_ex = [e for e in exceptions if e.date == day]
        if any(e.start_time is None for e in day_ex):
            continue
        for sch in schedules:
            if sch.weekday != persian_weekday(day):
                continue
            cursor = datetime.combine(day, sch.start_time, tzinfo=tz)
            end_of_block = datetime.combine(day, sch.end_time, tzinfo=tz)
            step = timedelta(minutes=sch.slot_minutes)
            while cursor + step <= end_of_block:
                t = cursor.time()
                blocked = any(e.start_time <= t < e.end_time for e in day_ex if e.start_time and e.end_time)
                key = (cursor, sch.kind)
                if cursor > now and not blocked and key not in wanted:
                    wanted.add(key)
                    slot = existing.get(key)
                    if slot is None:
                        to_create.append(Slot(start=cursor, end=cursor + step, capacity=sch.capacity, kind=sch.kind, **owner))
                    elif slot.capacity != sch.capacity:
                        slot.capacity = max(sch.capacity, slot.booked_count)
                        to_update.append(slot)
                cursor += step

    Slot.objects.bulk_create(to_create, ignore_conflicts=True, batch_size=1000)
    if to_update:
        Slot.objects.bulk_update(to_update, ["capacity"], batch_size=1000)
    # Drop unbooked future slots that no longer match the schedule (schedule edited / leave added)
    stale_ids = [s.pk for key, s in existing.items() if key not in wanted]
    if stale_ids:
        Slot.objects.filter(pk__in=stale_ids, booked_count=0).delete()
    refresh_first_free_slot(office=office, center=center)
    return len(to_create)


def refresh_first_free_slot(office=None, center=None):
    now = timezone.now()
    if office is not None:
        doctor = office.doctor
        first = (
            Slot.objects.filter(
                office__doctor=doctor,
                office__is_active=True,
                office__booking_enabled=True,
                start__gt=now,
                is_blocked=False,
                booked_count__lt=F("capacity"),
            ).aggregate(m=Min("start"))["m"]
        )
        type(doctor).objects.filter(pk=doctor.pk).update(first_free_slot_at=first)
    elif center is not None:
        first = Slot.objects.filter(
            center=center, start__gt=now, is_blocked=False, booked_count__lt=F("capacity")
        ).aggregate(m=Min("start"))["m"]
        type(center).objects.filter(pk=center.pk).update(first_free_slot_at=first)


def available_slots(office=None, center=None, date=None, kind=AppointmentKind.IN_PERSON):
    qs = Slot.objects.filter(
        start__gt=timezone.now() + timedelta(minutes=5),
        is_blocked=False,
        booked_count__lt=F("capacity"),
        kind=kind,
        **_owner_filter(office, center),
    )
    if date:
        qs = qs.filter(start__date=date)
    return qs.order_by("start")


def _new_tracking_code():
    while True:
        code = generate_numeric_code(8)
        if not Appointment.objects.filter(tracking_code=code).exists():
            return code


def _price_for(slot):
    if slot.office_id:
        return slot.office.booking_fee
    return slot.center.reception_fee


@transaction.atomic
def book_slot(*, user, slot_id, family_member=None, note="", extra_price=0, kind=None):
    """Reserve one seat of a slot. Atomic conditional UPDATE prevents overbooking on any database."""
    try:
        slot = Slot.objects.select_related("office__doctor", "center").get(pk=slot_id)
    except Slot.DoesNotExist as e:
        raise BookingError("نوبت انتخاب‌شده وجود ندارد.") from e
    if slot.start <= timezone.now():
        raise BookingError("زمان این نوبت گذشته است.")
    if slot.office_id and not (slot.office.is_active and slot.office.booking_enabled and slot.office.doctor.is_public):
        raise BookingError("نوبت‌دهی آنلاین برای این مطب فعال نیست.")
    if slot.center_id and not (slot.center.is_public and slot.center.online_reception):
        raise BookingError("پذیرش آنلاین برای این مرکز فعال نیست.")

    if family_member is not None:
        name, national_code = family_member.full_name, family_member.national_code
    else:
        if not user.profile_completed:
            raise BookingError("لطفاً ابتدا نام و کد ملی خود را در پروفایل تکمیل کنید.")
        name, national_code = user.full_name, user.national_code

    if Appointment.objects.filter(
        slot__start__date=slot.start.date(),
        patient_national_code=national_code,
        status__in=ACTIVE_STATUSES,
        **({"doctor": slot.office.doctor} if slot.office_id else {"center": slot.center}),
    ).exists():
        raise BookingError("برای این بیمار در همین روز نوبت فعال ثبت شده است.")

    updated = Slot.objects.filter(pk=slot.pk, is_blocked=False, booked_count__lt=F("capacity")).update(
        booked_count=F("booked_count") + 1
    )
    if not updated:
        raise BookingError("متأسفانه این نوبت لحظاتی پیش رزرو شد. لطفاً زمان دیگری انتخاب کنید.")

    price = _price_for(slot) + extra_price
    status = AppointmentStatus.PENDING_PAYMENT if price > 0 else AppointmentStatus.CONFIRMED
    try:
        appt = Appointment.objects.create(
            tracking_code=_new_tracking_code(),
            kind=kind or slot.kind,
            status=status,
            slot=slot,
            doctor=slot.office.doctor if slot.office_id else None,
            office=slot.office,
            center=slot.center,
            user=user,
            family_member=family_member,
            patient_name=name,
            patient_national_code=national_code,
            patient_mobile=user.mobile,
            start=slot.start,
            price=price,
            held_until=timezone.now() + timedelta(minutes=settings.SLOT_HOLD_MINUTES) if price > 0 else None,
            patient_note=note,
        )
    except IntegrityError as e:
        raise BookingError("خطا در ثبت نوبت؛ دوباره تلاش کنید.") from e

    transaction.on_commit(lambda: refresh_first_free_slot(office=slot.office, center=slot.center))
    if status == AppointmentStatus.CONFIRMED:
        transaction.on_commit(lambda: _notify_confirmed(appt.pk))
    return appt


def _notify_confirmed(appointment_id):
    from apps.notifications.tasks import notify_appointment_confirmed

    notify_appointment_confirmed.delay(appointment_id)


def _release_seat(appt):
    Slot.objects.filter(pk=appt.slot_id, booked_count__gt=0).update(booked_count=F("booked_count") - 1)
    transaction.on_commit(lambda: refresh_first_free_slot(office=appt.office, center=appt.center))


@transaction.atomic
def confirm_payment(appt: Appointment, amount: int):
    appt = Appointment.objects.select_for_update().get(pk=appt.pk)
    if appt.status != AppointmentStatus.PENDING_PAYMENT:
        return appt
    appt.paid_amount = amount
    appt.status = AppointmentStatus.CONFIRMED
    appt.held_until = None
    appt.save(update_fields=["paid_amount", "status", "held_until", "updated_at"])
    transaction.on_commit(lambda: _notify_confirmed(appt.pk))
    return appt


def refund_amount_for(appt: Appointment, by_provider: bool) -> int:
    if appt.paid_amount == 0:
        return 0
    if by_provider:
        return appt.paid_amount
    hours_left = (appt.start - timezone.now()).total_seconds() / 3600
    return appt.paid_amount if hours_left >= settings.CANCEL_FULL_REFUND_HOURS else 0


@transaction.atomic
def cancel_appointment(appt: Appointment, *, by, reason="", by_provider=False):
    appt = Appointment.objects.select_for_update().get(pk=appt.pk)
    if appt.status not in ACTIVE_STATUSES:
        raise BookingError("این نوبت قابل لغو نیست.")
    if not by_provider and appt.start <= timezone.now():
        raise BookingError("زمان نوبت گذشته است و امکان لغو وجود ندارد.")
    refund = refund_amount_for(appt, by_provider)
    appt.status = AppointmentStatus.CANCELLED
    appt.cancelled_at = timezone.now()
    appt.cancelled_by = by
    appt.cancel_reason = reason
    appt.held_until = None
    if refund:
        from apps.payments.services import credit_wallet

        credit_wallet(appt.user, refund, kind="refund", appointment=appt, description=f"استرداد نوبت {appt.tracking_code}")
        appt.refunded_amount = refund
    appt.save()
    _release_seat(appt)

    from apps.notifications.tasks import notify_appointment_cancelled

    transaction.on_commit(lambda: notify_appointment_cancelled.delay(appt.pk))
    return appt, refund


@transaction.atomic
def expire_holds():
    expired = list(
        Appointment.objects.select_for_update().filter(
            status=AppointmentStatus.PENDING_PAYMENT, held_until__lt=timezone.now()
        )
    )
    for appt in expired:
        appt.status = AppointmentStatus.EXPIRED
        appt.save(update_fields=["status", "updated_at"])
        _release_seat(appt)
    return len(expired)


def mark_attendance(appt: Appointment, attended: bool):
    if appt.status != AppointmentStatus.CONFIRMED:
        raise BookingError("فقط نوبت‌های قطعی قابل ثبت حضور هستند.")
    appt.status = AppointmentStatus.ATTENDED if attended else AppointmentStatus.NO_SHOW
    appt.save(update_fields=["status", "updated_at"])
    if attended and appt.doctor_id:
        type(appt.doctor).objects.filter(pk=appt.doctor_id).update(
            successful_appointments=F("successful_appointments") + 1
        )
    return appt
