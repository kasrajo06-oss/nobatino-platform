from datetime import timedelta

import jdatetime
from celery import shared_task
from django.conf import settings
from django.utils import timezone

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

    return Appointment.objects.select_related("doctor", "center", "office").get(pk=appointment_id)


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


@shared_task
def notify_appointment_cancelled(appointment_id):
    a = _appt(appointment_id)
    text = f"{settings.BRAND_NAME}: نوبت {a.tracking_code} ({fa_datetime(a.start)}) لغو شد."
    if a.refunded_amount:
        text += f"\nمبلغ {a.refunded_amount:,} تومان به کیف پول شما بازگشت."
    get_backend().send(a.patient_mobile, text, "appointment_cancelled")


@shared_task
def send_reminders():
    from apps.scheduling.models import Appointment, AppointmentStatus

    now = timezone.now()
    backend = get_backend()
    count = 0
    for field, delta in (("reminded_24h", timedelta(hours=24)), ("reminded_2h", timedelta(hours=2))):
        qs = Appointment.objects.filter(
            status=AppointmentStatus.CONFIRMED, start__gt=now, start__lte=now + delta, **{field: False}
        ).select_related("doctor", "center")
        for a in qs:
            backend.send(a.patient_mobile, f"یادآوری {settings.BRAND_NAME}: نوبت شما نزد {a.provider_name} در {fa_datetime(a.start)}. کد پیگیری {a.tracking_code}", "reminder")
            Appointment.objects.filter(pk=a.pk).update(**{field: True})
            count += 1
    return count
