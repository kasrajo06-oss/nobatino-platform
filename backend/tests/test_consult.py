from datetime import time, timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.consult.models import Consultation, ConsultService
from apps.consult.services import expire_overdue, sync_offer_flags
from apps.payments.models import Payment
from apps.payments.services import credit_wallet, get_wallet
from apps.scheduling.models import Appointment, Slot, WeeklySchedule, persian_weekday
from apps.scheduling.services import generate_slots

from .test_flows import doctor, make_patient, ref  # noqa: F401  (pytest fixtures)

pytestmark = pytest.mark.django_db


@pytest.fixture
def online_doctor(doctor):  # noqa: F811
    for kind, price in (("text", 100000), ("phone", 200000), ("video", 250000)):
        ConsultService.objects.create(doctor=doctor, kind=kind, price=price, instant_enabled=kind == "text")
    tomorrow = timezone.localdate() + timedelta(days=1)
    WeeklySchedule.objects.create(doctor=doctor, weekday=persian_weekday(tomorrow), start_time=time(10), end_time=time(11), kind="online")
    generate_slots(doctor=doctor, days=3)
    sync_offer_flags(doctor)
    doctor.refresh_from_db()
    return doctor


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


def pay(client, code, django_capture_on_commit_callbacks):
    r = client.post("/api/payments/start", {"tracking_code": code, "use_wallet": False}, format="json")
    pay = Payment.objects.get(pk=r.json()["payment_id"])
    with django_capture_on_commit_callbacks(execute=True):
        client.get("/api/payments/callback", {"pid": pay.pk, "Authority": pay.authority, "Status": "OK"})


def test_profile_lists_services_and_online_slots(online_doctor):
    c = APIClient()
    d = c.get(f"/api/doctors/{online_doctor.short_id}/").json()
    assert {s["kind"] for s in d["consult_services"]} == {"text", "phone", "video"}
    assert d["first_online_slot_at"]
    days = c.get(f"/api/doctors/{online_doctor.short_id}/online-availability/").json()["days"]
    day = next(x for x in days if x["free"])
    slots = c.get(f"/api/doctors/{online_doctor.short_id}/online-slots/", {"date": day["date"]}).json()["slots"]
    assert len(slots) == 4
    assert c.get("/api/doctors/", {"appointment_type": "video"}).json()["count"] == 1


def test_text_consultation_full_cycle(online_doctor, django_capture_on_commit_callbacks):
    patient = make_patient()
    pc = client_for(patient)
    r = pc.post("/api/me/consultations/", {"doctor": online_doctor.short_id, "kind": "text", "complaint": "سردرد مزمن دارم از دو هفته پیش"}, format="json")
    assert r.status_code == 201, r.content
    code = r.json()["appointment"]["tracking_code"]
    assert r.json()["appointment"]["status"] == "pending_payment"
    pay(pc, code, django_capture_on_commit_callbacks)

    consult = Consultation.objects.get(appointment__tracking_code=code)
    assert consult.doctor_deadline and consult.state == "waiting"
    assert pc.post(f"/api/me/consultations/{code}/messages/", {"text": "این هم آزمایش قبلی"}).status_code == 201

    dc = client_for(online_doctor.user)
    inbox = dc.get("/api/doctor-panel/consultations/", {"state": "waiting"}).json()["results"]
    assert [c["appointment"]["tracking_code"] for c in inbox] == [code]
    assert dc.post(f"/api/doctor-panel/consultations/{code}/messages/", {"text": "سلام، لطفاً فشار خون را هم بنویسید"}).status_code == 201
    consult.refresh_from_db()
    assert consult.state == "active" and consult.closes_at

    msgs = pc.get(f"/api/me/consultations/{code}/messages/", {"after": 0}).json()["messages"]
    assert any(m["from_doctor"] for m in msgs)
    assert dc.post(f"/api/doctor-panel/consultations/{code}/close/", {"summary": "استراحت و مصرف مایعات"}).status_code == 200
    appt = Appointment.objects.get(tracking_code=code)
    assert appt.status == "attended"
    assert pc.post(f"/api/me/consultations/{code}/messages/", {"text": "سؤال دیگر"}).status_code == 400
    # patient can now review
    assert pc.post("/api/me/reviews/", {"appointment": appt.id, "rating": 5, "text": "عالی"}, format="json").status_code == 201


def test_other_users_cannot_read_consultation(online_doctor):
    patient = make_patient()
    credit_wallet(patient, 500000, kind="topup")
    pc = client_for(patient)
    code = pc.post("/api/me/consultations/", {"doctor": online_doctor.short_id, "kind": "text", "complaint": "سؤال درباره داروی فشار خون"}, format="json").json()["appointment"]["tracking_code"]
    stranger = client_for(make_patient("09129999999", national_code="0499370899"))
    assert stranger.get(f"/api/me/consultations/{code}/messages/").status_code in (403, 404)


def test_unanswered_consultation_is_refunded(online_doctor, django_capture_on_commit_callbacks):
    patient = make_patient()
    pc = client_for(patient)
    code = pc.post("/api/me/consultations/", {"doctor": online_doctor.short_id, "kind": "text", "complaint": "درد معده بعد از غذا دارم"}, format="json").json()["appointment"]["tracking_code"]
    pay(pc, code, django_capture_on_commit_callbacks)
    Consultation.objects.filter(appointment__tracking_code=code).update(doctor_deadline=timezone.now() - timedelta(minutes=1))
    assert expire_overdue() == (1, 0)
    assert Appointment.objects.get(tracking_code=code).status == "cancelled"
    assert get_wallet(patient).balance == 100000


def test_scheduled_video_call_books_online_slot_and_signals(online_doctor, django_capture_on_commit_callbacks):
    patient = make_patient()
    pc = client_for(patient)
    slot = Slot.objects.filter(doctor=online_doctor).first()
    r = pc.post("/api/me/consultations/", {"doctor": online_doctor.short_id, "kind": "video", "slot": slot.id, "complaint": "مشاوره درباره نتیجه آزمایش"}, format="json")
    assert r.status_code == 201, r.content
    code = r.json()["appointment"]["tracking_code"]
    assert r.json()["appointment"]["price"] == 250000
    slot.refresh_from_db()
    assert slot.booked_count == 1
    pay(pc, code, django_capture_on_commit_callbacks)

    dc = client_for(online_doctor.user)
    assert dc.post(f"/api/doctor-panel/consultations/{code}/signals/", {"kind": "ring"}, format="json").status_code == 201
    assert dc.post(f"/api/doctor-panel/consultations/{code}/signals/", {"kind": "offer", "payload": {"sdp": "x"}}, format="json").status_code == 201
    got = pc.get(f"/api/me/consultations/{code}/signals/", {"after": 0}).json()
    assert [s["kind"] for s in got] == ["ring", "offer"]
    assert Consultation.objects.get(appointment__tracking_code=code).state == "active"


def test_patient_can_cancel_waiting_consultation_with_full_refund(online_doctor, django_capture_on_commit_callbacks):
    patient = make_patient()
    pc = client_for(patient)
    code = pc.post("/api/me/consultations/", {"doctor": online_doctor.short_id, "kind": "text", "complaint": "سؤال درباره رژیم غذایی"}, format="json").json()["appointment"]["tracking_code"]
    pay(pc, code, django_capture_on_commit_callbacks)
    r = pc.post(f"/api/me/consultations/{code}/cancel/", {}, format="json")
    assert r.status_code == 200 and r.json()["refunded"] == 100000


def test_instant_requires_doctor_online(online_doctor):
    pc = client_for(make_patient())
    body = {"doctor": online_doctor.short_id, "kind": "text", "instant": True, "complaint": "تب بالا دارم چه کنم؟"}
    assert pc.post("/api/me/consultations/", body, format="json").status_code == 409
    dc = client_for(online_doctor.user)
    assert dc.post("/api/doctor-panel/presence/", {"online": True}, format="json").json()["available_now"] is True
    assert pc.post("/api/me/consultations/", body, format="json").status_code == 201


def test_otp_debug_code_only_when_enabled(settings):
    settings.OTP_SHOW_CODE = True
    r = APIClient().post("/api/auth/otp/request", {"mobile": "09121234567"})
    assert len(r.json()["debug_code"]) == 5
    settings.OTP_SHOW_CODE = False
    r = APIClient().post("/api/auth/otp/request", {"mobile": "09121234568"})
    assert "debug_code" not in r.json()


def test_home_endpoint(online_doctor):
    data = APIClient().get("/api/home/").json()
    assert data["cities"][0]["doctor_count"] == 1
    cardio = next(s for s in data["specialties"] if s["slug"] == "cardiology")
    assert cardio["doctor_count"] == 1 and cardio["online_count"] == 1
