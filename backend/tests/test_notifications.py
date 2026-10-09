import pytest
from rest_framework.test import APIClient

from apps.notifications.models import Notification

from .test_consult import client_for, online_doctor, pay  # noqa: F401  (fixtures/helpers)
from .test_flows import doctor, make_patient, ref  # noqa: F401

pytestmark = pytest.mark.django_db


def start_paid_text_consult(doc, patient, capture):
    pc = client_for(patient)
    code = pc.post("/api/me/consultations/", {"doctor": doc.short_id, "kind": "text", "complaint": "سؤال درباره نتیجه آزمایش خون"}, format="json").json()["appointment"]["tracking_code"]
    pay(pc, code, capture)
    return pc, code


def kinds(user):
    return list(Notification.objects.filter(user=user).values_list("kind", flat=True))


def test_consultation_events_notify_the_other_side(online_doctor, django_capture_on_commit_callbacks):  # noqa: F811
    patient = make_patient()
    pc, code = start_paid_text_consult(online_doctor, patient, django_capture_on_commit_callbacks)
    doc_user = online_doctor.user
    assert "consult_request" in kinds(doc_user)
    assert "appointment_confirmed" in kinds(patient)

    dc = client_for(doc_user)
    dc.post(f"/api/doctor-panel/consultations/{code}/messages/", {"text": "سلام"})
    dc.post(f"/api/doctor-panel/consultations/{code}/messages/", {"text": "لطفاً فشار خون را هم بفرستید"})
    assert "consult_started" in kinds(patient)
    # two messages are merged into one unread notification
    msg = Notification.objects.get(user=patient, kind="consult_message")
    assert msg.count == 2 and "فشار خون" in msg.body and msg.link == f"/consult/{code}"

    pc.post(f"/api/me/consultations/{code}/messages/", {"text": "چشم"})
    assert Notification.objects.filter(user=doc_user, kind="consult_message").exists()

    summary = pc.get("/api/me/notifications/summary/").json()
    assert summary["unread"] >= 3 and summary["call"] is None
    # opening the room marks its notifications read
    pc.post("/api/me/notifications/read/", {"link": f"/consult/{code}"}, format="json")
    assert not Notification.objects.filter(user=patient, link=f"/consult/{code}", is_read=False).exists()

    dc.post(f"/api/doctor-panel/consultations/{code}/close/", {"summary": "استراحت"})
    assert "consult_closed" in kinds(patient)


def test_incoming_call_answer_and_missed_call(online_doctor, django_capture_on_commit_callbacks):  # noqa: F811
    from apps.scheduling.models import Slot

    patient = make_patient()
    pc = client_for(patient)
    slot = Slot.objects.filter(doctor=online_doctor).first()
    code = pc.post("/api/me/consultations/", {"doctor": online_doctor.short_id, "kind": "video", "slot": slot.id, "complaint": "بررسی ضایعه پوستی"}, format="json").json()["appointment"]["tracking_code"]
    pay(pc, code, django_capture_on_commit_callbacks)
    dc = client_for(online_doctor.user)

    dc.post(f"/api/doctor-panel/consultations/{code}/signals/", {"kind": "ring"}, format="json")
    call = pc.get("/api/me/notifications/summary/").json()["call"]
    assert call and call["kind"] == "call_incoming" and call["link"] == f"/consult/{code}"
    pc.post(f"/api/me/consultations/{code}/signals/", {"kind": "answer", "payload": {}}, format="json")
    assert pc.get("/api/me/notifications/summary/").json()["call"] is None

    # second call, doctor hangs up before the patient answers -> missed call
    dc.post(f"/api/doctor-panel/consultations/{code}/signals/", {"kind": "ring"}, format="json")
    dc.post(f"/api/doctor-panel/consultations/{code}/signals/", {"kind": "hangup"}, format="json")
    assert "call_missed" in kinds(patient)
    assert pc.get("/api/me/notifications/summary/").json()["call"] is None


def test_in_person_booking_notifies_patient_and_doctor(doctor, django_capture_on_commit_callbacks):  # noqa: F811
    from apps.payments.services import credit_wallet
    from apps.scheduling.models import Slot

    patient = make_patient()
    credit_wallet(patient, 100000, kind="topup")
    pc = client_for(patient)
    slot = Slot.objects.filter(office__doctor=doctor).first()
    code = pc.post("/api/me/appointments/", {"slot": slot.id}, format="json").json()["tracking_code"]
    with django_capture_on_commit_callbacks(execute=True):
        pc.post("/api/payments/start", {"tracking_code": code}, format="json")
    assert "appointment_confirmed" in kinds(patient)
    assert "appointment_new" in kinds(doctor.user)

    dc = client_for(doctor.user)
    with django_capture_on_commit_callbacks(execute=True):
        dc.post(f"/api/doctor-panel/appointments/{code}/cancel/", {"reason": "مرخصی"}, format="json")
    n = Notification.objects.get(user=patient, kind="appointment_cancelled")
    assert "مرخصی" in n.body and "کیف پول" in n.body


def test_notifications_are_private_and_mark_all_read(doctor):  # noqa: F811
    from apps.notifications.inbox import notify

    a, b = make_patient(), make_patient("09123334444", national_code="0499370899")
    notify(a, "account", "سلام")
    assert APIClient().get("/api/me/notifications/").status_code in (401, 403)
    assert client_for(b).get("/api/me/notifications/").json()["count"] == 0
    ca = client_for(a)
    assert ca.get("/api/me/notifications/", {"unread": "true"}).json()["count"] == 1
    assert ca.post("/api/me/notifications/read/", {"all": True}, format="json").json()["marked"] == 1
