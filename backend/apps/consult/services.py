"""Online consultation lifecycle.

Every consultation is an Appointment (kind phone/text/video) so payment, refunds, reviews and panels are shared.
- text: doctor must answer within TEXT_FIRST_RESPONSE_HOURS after payment; chat stays open TEXT_OPEN_HOURS after that.
- phone/video (scheduled): booked on the doctor's online slots; call happens in-browser (WebRTC) at slot time.
- instant: doctor must accept within INSTANT_ACCEPT_MINUTES, otherwise the patient is refunded automatically.
"""
from datetime import timedelta

from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone

from apps.core.storage import validate_upload
from apps.scheduling.models import AppointmentStatus
from apps.scheduling.services import (
    BookingError,
    book_slot,
    cancel_appointment,
    create_appointment,
    mark_attendance,
)

from .models import Consultation, ConsultKind, ConsultMessage, ConsultService

TEXT_FIRST_RESPONSE_HOURS = 24
TEXT_OPEN_HOURS = 48
INSTANT_ACCEPT_MINUTES = 10
CALL_GRACE_MINUTES = 30


class ConsultError(Exception):
    pass


def sync_offer_flags(doctor):
    """Keep the denormalised offers_* flags (used by search filters and cards) in sync with services."""
    active = set(ConsultService.objects.filter(doctor=doctor, is_active=True).values_list("kind", flat=True))
    instant = ConsultService.objects.filter(doctor=doctor, is_active=True, instant_enabled=True).exists()
    type(doctor).objects.filter(pk=doctor.pk).update(
        offers_phone="phone" in active, offers_text="text" in active, offers_video="video" in active, offers_instant=instant
    )


@transaction.atomic
def start_consultation(*, user, doctor, kind, complaint, slot_id=None, instant=False, family_member=None):
    if kind not in ConsultKind.values:
        raise ConsultError("نوع مشاوره نامعتبر است.")
    if not doctor.is_public:
        raise ConsultError("این پزشک در حال حاضر مشاوره آنلاین ندارد.")
    service = ConsultService.objects.filter(doctor=doctor, kind=kind, is_active=True).first()
    if not service:
        raise ConsultError("این پزشک این نوع مشاوره را ارائه نمی‌دهد.")
    if not complaint or len(complaint.strip()) < 10:
        raise ConsultError("شرح حال و سؤال خود را دقیق‌تر بنویسید (حداقل ۱۰ حرف).")

    if instant:
        if not (service.instant_enabled and doctor.available_now):
            raise ConsultError("پزشک در حال حاضر برای مشاوره فوری در دسترس نیست.")
        appt = create_appointment(user=user, kind=kind, price=service.price, start=timezone.now(), family_member=family_member, doctor=doctor)
    elif kind == ConsultKind.TEXT:
        appt = create_appointment(user=user, kind=kind, price=service.price, start=timezone.now(), family_member=family_member, doctor=doctor)
    else:
        if not slot_id:
            raise ConsultError("زمان تماس را انتخاب کنید.")
        appt = book_slot(user=user, slot_id=slot_id, family_member=family_member, kind=kind, price=service.price)
        if appt.doctor_id != doctor.id:
            raise ConsultError("زمان انتخاب‌شده متعلق به این پزشک نیست.")

    consult = Consultation.objects.create(appointment=appt, kind=kind, is_instant=instant, complaint=complaint.strip())
    if appt.status == AppointmentStatus.CONFIRMED:  # free consultation: already confirmed before the row existed
        transaction.on_commit(lambda: on_appointment_confirmed(appt.pk))
    return consult


def on_appointment_confirmed(appointment_id):
    """Called (on commit) when an appointment becomes confirmed; starts consultation timers and notifies the doctor."""
    consult = Consultation.objects.select_related("appointment__doctor__user").filter(appointment_id=appointment_id).first()
    if not consult or consult.doctor_deadline:
        return
    now = timezone.now()
    appt = consult.appointment
    if consult.is_instant:
        deadline = now + timedelta(minutes=INSTANT_ACCEPT_MINUTES)
    elif consult.kind == ConsultKind.TEXT:
        deadline = now + timedelta(hours=TEXT_FIRST_RESPONSE_HOURS)
    else:
        deadline = appt.start + timedelta(minutes=CALL_GRACE_MINUTES)
    Consultation.objects.filter(pk=consult.pk).update(doctor_deadline=deadline)
    ConsultMessage.objects.create(
        consultation=consult, is_system=True,
        text="درخواست مشاوره ثبت شد و برای پزشک ارسال شد. پاسخ پزشک در همین صفحه نمایش داده می‌شود.",
    )
    from apps.notifications.tasks import send_sms

    send_sms.delay(
        appt.doctor.user.mobile,
        f"درخواست {consult.get_kind_display()}{' فوری' if consult.is_instant else ''} جدید از {appt.patient_name}. کد {appt.tracking_code}",
        "consult_new",
    )


def _ensure_open(consult):
    if consult.appointment.status != AppointmentStatus.CONFIRMED:
        raise ConsultError("این مشاوره فعال نیست.")
    if consult.state == Consultation.State.CLOSED:
        raise ConsultError("این مشاوره به پایان رسیده است.")


@transaction.atomic
def activate(consult, by_doctor_user):
    """Doctor accepts (instant/call) or first replies (text)."""
    consult = Consultation.objects.select_for_update(of=("self",)).select_related("appointment").get(pk=consult.pk)
    _ensure_open(consult)
    if consult.state == Consultation.State.ACTIVE:
        return consult
    now = timezone.now()
    consult.state = Consultation.State.ACTIVE
    consult.started_at = now
    if consult.kind == ConsultKind.TEXT:
        consult.closes_at = now + timedelta(hours=TEXT_OPEN_HOURS)
    consult.save(update_fields=["state", "started_at", "closes_at", "updated_at"])
    ConsultMessage.objects.create(consultation=consult, is_system=True, text="پزشک مشاوره را آغاز کرد.")
    from apps.notifications.tasks import send_sms

    appt = consult.appointment
    send_sms.delay(appt.patient_mobile, f"پزشک به درخواست مشاوره {appt.tracking_code} پاسخ داد. برای ادامه وارد پنل شوید.", "consult_started")
    return consult


def post_message(consult, user, text="", file=None):
    _ensure_open(consult)
    is_doctor = consult.is_doctor(user)
    if not (text.strip() or file):
        raise ConsultError("پیام خالی است.")
    try:
        validate_upload(file)
    except ValidationError as e:
        raise ConsultError(e.messages[0]) from e
    if is_doctor and consult.state == Consultation.State.WAITING:
        activate(consult, user)
    if consult.closes_at and consult.closes_at < timezone.now():
        raise ConsultError("زمان این گفتگو به پایان رسیده است.")
    return ConsultMessage.objects.create(consultation=consult, sender=user, from_doctor=is_doctor, text=text.strip()[:4000], file=file or "")


@transaction.atomic
def close(consult, *, summary="", system=False):
    consult = Consultation.objects.select_for_update(of=("self",)).select_related("appointment__doctor").get(pk=consult.pk)
    if consult.state == Consultation.State.CLOSED:
        return consult
    if consult.state != Consultation.State.ACTIVE:
        raise ConsultError("مشاوره هنوز آغاز نشده است.")
    consult.state = Consultation.State.CLOSED
    consult.closed_at = timezone.now()
    consult.doctor_summary = summary.strip()[:4000]
    consult.save(update_fields=["state", "closed_at", "doctor_summary", "updated_at"])
    ConsultMessage.objects.create(
        consultation=consult, is_system=True,
        text="مشاوره به پایان رسید." + ("" if system else " می‌توانید از بخش نوبت‌های من برای پزشک نظر ثبت کنید."),
    )
    mark_attendance(consult.appointment, True)
    return consult


def cancel_by_patient(consult, user, reason=""):
    """Patient may cancel while the doctor has not started yet — always a full refund."""
    if consult.state != Consultation.State.WAITING:
        raise ConsultError("مشاوره آغاز شده و قابل لغو نیست.")
    try:
        appt, refund = cancel_appointment(consult.appointment, by=user, reason=reason or "لغو توسط بیمار", by_provider=True)
    except BookingError as e:
        raise ConsultError(str(e)) from e
    Consultation.objects.filter(pk=consult.pk).update(state=Consultation.State.CLOSED, closed_at=timezone.now())
    return refund


def expire_overdue():
    """Refund consultations the doctor never started; auto-close text chats whose window ended."""
    now = timezone.now()
    refunded = closed = 0
    overdue = Consultation.objects.filter(
        state=Consultation.State.WAITING, doctor_deadline__lt=now, appointment__status=AppointmentStatus.CONFIRMED
    ).select_related("appointment")
    for consult in overdue:
        try:
            cancel_appointment(consult.appointment, by=None, reason="عدم پاسخ پزشک در مهلت مقرر", by_provider=True)
        except BookingError:
            continue
        Consultation.objects.filter(pk=consult.pk).update(state=Consultation.State.CLOSED, closed_at=now)
        ConsultMessage.objects.create(consultation=consult, is_system=True, text="پزشک در مهلت مقرر پاسخ نداد؛ مبلغ به کیف پول شما بازگشت.")
        refunded += 1
    for consult in Consultation.objects.filter(state=Consultation.State.ACTIVE, closes_at__lt=now):
        close(consult, system=True)
        closed += 1
    return refunded, closed

