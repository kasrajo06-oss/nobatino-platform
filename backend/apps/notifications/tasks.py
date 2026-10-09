from datetime import timedelta

import jdatetime
from celery import shared_task
from django.conf import settings
from django.utils import timezone

from .inbox import notify
from .models import Notification
from .sms import get_backend


def fa_datetime(dt):
    local = timezone.localtime(dt)
    j = jdatetime.datetime.fromgregorian(datetime=local)
    return j.strftime("%Y/%m/%d ساعت %H:%M")


@shared_task
def send_otp_sms(mobile, code):
    get_backend().send_otp(mobile, code)


@shared_task
def send_sms(mobile, text, kind="general"):
    get_backend().send(mobile, text, kind)


def _appt(appointment_id):
    from apps.scheduling.models import Appointment

    return Appointment.objects.select_related("doctor__user", "center", "office", "user").get(pk=appointment_id)


def _center_staff(center):
    from apps.accounts.models import User

    return User.objects.filter(center_memberships__center=center)


@shared_task
def notify_appointment_confirmed(appointment_id):
    a = _appt(appointment_id)
    if a.is_online:
        text = (
            f"{settings.BRAND_NAME}: {a.get_kind_display()} {a.patient_name} با {a.provider_name} ثبت شد.\n"
            f"کد پیگیری: {a.tracking_code}\nورود به اتاق مشاوره: {settings.SITE_URL}/consult/{a.tracking_code}"
        )
    else:
        where = a.office.address if a.office_id else a.center.address
        text = (
            f"{settings.BRAND_NAME}: نوبت {a.patient_name} نزد {a.provider_name} برای {fa_datetime(a.start)} ثبت شد.\n"
            f"کد پیگیری: {a.tracking_code}\nآدرس: {where}"
        )
    get_backend().send(a.patient_mobile, text, "appointment_confirmed")

    K = Notification.Kind
    if a.is_online:
        notify(a.user, K.APPOINTMENT_CONFIRMED, f"{a.get_kind_display()} با {a.provider_name} ثبت شد", "برای ادامه وارد اتاق مشاوره شوید.", f"/consult/{a.tracking_code}")
        return  # the doctor is notified by the consult module (consult_request)
    notify(a.user, K.APPOINTMENT_CONFIRMED, f"نوبت شما نزد {a.provider_name} ثبت شد", f"{fa_datetime(a.start)} — کد پیگیری {a.tracking_code}", "/panel/appointments")
    if a.doctor_id:
        notify(a.doctor.user, K.APPOINTMENT_NEW, f"نوبت جدید: {a.patient_name}", fa_datetime(a.start), "/doctor-panel/appointments")
    elif a.center_id:
        for staff in _center_staff(a.center):
            notify(staff, K.APPOINTMENT_NEW, f"پذیرش جدید: {a.patient_name}", fa_datetime(a.start), "/center-panel")


@shared_task
def notify_appointment_cancelled(appointment_id):
    a = _appt(appointment_id)
    text = f"{settings.BRAND_NAME}: نوبت {a.tracking_code} ({fa_datetime(a.start)}) لغو شد."
    if a.refunded_amount:
        text += f"\nمبلغ {a.refunded_amount:,} تومان به کیف پول شما بازگشت."
    get_backend().send(a.patient_mobile, text, "appointment_cancelled")

    K = Notification.Kind
    by_patient = a.cancelled_by_id == a.user_id
    refund = f" — {a.refunded_amount:,} تومان به کیف پول برگشت." if a.refunded_amount else ""
    if not by_patient:
        notify(a.user, K.APPOINTMENT_CANCELLED, f"نوبت {a.provider_name} لغو شد", (a.cancel_reason or "") + refund, "/panel/appointments")
    if a.doctor_id and a.cancelled_by_id != a.doctor.user_id:
        notify(a.doctor.user, K.APPOINTMENT_CANCELLED, f"نوبت {a.patient_name} لغو شد", fa_datetime(a.start), "/doctor-panel/appointments")


@shared_task
def send_reminders():
    from apps.scheduling.models import Appointment, AppointmentStatus

    now = timezone.now()
    backend = get_backend()
    count = 0
    for field, delta in (("reminded_24h", timedelta(hours=24)), ("reminded_2h", timedelta(hours=2))):
        qs = Appointment.objects.filter(
            status=AppointmentStatus.CONFIRMED, start__gt=now, start__lte=now + delta, **{field: False}
        ).select_related("doctor__user", "center", "user")
        for a in qs:
            when = fa_datetime(a.start)
            if a.is_online:
                notify(a.user, Notification.Kind.REMINDER, f"یادآوری {a.get_kind_display()}", f"{a.provider_name} — {when}", f"/consult/{a.tracking_code}")
                if a.doctor_id:
                    notify(a.doctor.user, Notification.Kind.REMINDER, f"یادآوری {a.get_kind_display()}", f"{a.patient_name} — {when}", f"/consult/{a.tracking_code}")
            else:
                notify(a.user, Notification.Kind.REMINDER, f"یادآوری نوبت {a.provider_name}", when, "/panel/appointments")
            if a.is_online:
                room = f"{settings.SITE_URL}/consult/{a.tracking_code}"
                backend.send(a.patient_mobile, f"یادآوری {settings.BRAND_NAME}: {a.get_kind_display()} با {a.provider_name} در {fa_datetime(a.start)}. ورود به اتاق مشاوره: {room}", "reminder")
                if a.doctor_id:
                    backend.send(a.doctor.user.mobile, f"یادآوری: {a.get_kind_display()} با {a.patient_name} در {fa_datetime(a.start)}. {room}", "reminder_doctor")
            else:
                backend.send(a.patient_mobile, f"یادآوری {settings.BRAND_NAME}: نوبت شما نزد {a.provider_name} در {fa_datetime(a.start)}. کد پیگیری {a.tracking_code}", "reminder")
            Appointment.objects.filter(pk=a.pk).update(**{field: True})
            count += 1
    return count
