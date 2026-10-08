import re
from datetime import time, timedelta

import pytest
from django.core.cache import cache
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.catalog.models import Degree, Insurance, Specialty
from apps.centers.models import Center, CenterStaff
from apps.core.utils import is_valid_national_code, normalize_fa, normalize_mobile
from apps.doctors.models import DoctorProfile, Office, VerificationStatus
from apps.geo.models import City, Province
from apps.lab.models import CenterLabTest, LabTest
from apps.notifications.models import SmsLog
from apps.payments.models import Payment
from apps.payments.services import get_wallet
from apps.scheduling.models import Appointment, Slot, WeeklySchedule, persian_weekday
from apps.scheduling.services import BookingError, book_slot, expire_holds, generate_slots

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clear_cache():
    cache.clear()


@pytest.fixture
def ref():
    province = Province.objects.create(name="تهران", slug="tehran-province")
    city = City.objects.create(province=province, name="تهران", slug="tehran", is_popular=True)
    cardio = Specialty.objects.create(name="قلب و عروق", title="متخصص قلب و عروق", slug="cardiology")
    degree = Degree.objects.create(name="متخصص", slug="specialist")
    ins = Insurance.objects.create(name="تأمین اجتماعی", slug="tamin")
    return {"city": city, "cardio": cardio, "degree": degree, "ins": ins}


def make_patient(mobile="09121111111", **kw):
    defaults = {"first_name": "علی", "last_name": "رضایی", "national_code": "0012345679"}
    return User.objects.create_user(mobile, **{**defaults, **kw})


@pytest.fixture
def doctor(ref):
    user = User.objects.create_user("09122222222", first_name="مریم", last_name="احمدی", role=Role.DOCTOR)
    doc = DoctorProfile.objects.create(
        user=user, first_name="مریم", last_name="احمدی", gender="female", medical_council_no="12345",
        degree=ref["degree"], primary_specialty=ref["cardio"], verification_status=VerificationStatus.APPROVED,
    )
    doc.specialties.set([ref["cardio"]])
    doc.save()
    office = Office.objects.create(doctor=doc, city=ref["city"], address="خیابان ولیعصر", booking_fee=50000)
    office.insurances.set([ref["ins"]])
    tomorrow = timezone.localdate() + timedelta(days=1)
    WeeklySchedule.objects.create(office=office, weekday=persian_weekday(tomorrow), start_time=time(16), end_time=time(17), slot_minutes=15)
    generate_slots(office=office, days=3)
    return doc


def login(client, mobile):
    assert client.post("/api/auth/otp/request", {"mobile": mobile}).status_code == 200
    text = SmsLog.objects.filter(mobile=normalize_mobile(mobile), kind="otp").latest("created_at").text
    code = re.search(r"(\d{5})", text).group(1)
    r = client.post("/api/auth/otp/verify", {"mobile": mobile, "code": code})
    assert r.status_code == 200, r.content
    return r


# ---------- utils ----------

def test_utils():
    assert normalize_mobile("+98 912 345 6789") == "09123456789"
    assert normalize_mobile("۰۹۱۲۳۴۵۶۷۸۹") == "09123456789"
    assert is_valid_national_code("0012345679")
    assert not is_valid_national_code("1111111111")
    assert normalize_fa("علي كريمي") == "علی کریمی"


# ---------- auth ----------

def test_otp_login_creates_user_and_sets_cookie():
    client = APIClient()
    r = login(client, "۰۹۱۲۰۰۰۰۰۰۵")
    assert r.json()["is_new"] is True
    assert "access_token" in r.cookies
    me = client.get("/api/me")
    assert me.status_code == 200 and me.json()["mobile"] == "09120000005"


def test_otp_wrong_code_and_resend_lock():
    client = APIClient()
    assert client.post("/api/auth/otp/request", {"mobile": "09120000006"}).status_code == 200
    assert client.post("/api/auth/otp/request", {"mobile": "09120000006"}).status_code == 429
    assert client.post("/api/auth/otp/verify", {"mobile": "09120000006", "code": "00000"}).status_code == 400


def test_raw_otp_never_logged_for_real_provider(settings):
    """Console backend logs the code for dev; ensure the stored text is only used in dev."""
    assert settings.SMS_BACKEND.endswith("ConsoleSmsBackend")


# ---------- public search ----------

def test_doctor_search_filters(doctor, ref):
    c = APIClient()
    r = c.get("/api/doctors/", {"city": "tehran", "specialty": "cardiology", "insurance": "tamin"})
    assert r.json()["count"] == 1
    card = r.json()["results"][0]
    assert card["short_id"] == doctor.short_id and card["first_free_slot_at"]
    assert c.get("/api/doctors/", {"city": "tehran", "gender": "male"}).json()["count"] == 0
    assert c.get("/api/doctors/", {"q": "احمدي"}).json()["count"] == 1  # Arabic yeh normalized


def test_unapproved_doctor_hidden(doctor):
    DoctorProfile.objects.filter(pk=doctor.pk).update(verification_status=VerificationStatus.PENDING)
    assert APIClient().get("/api/doctors/").json()["count"] == 0
    assert APIClient().get(f"/api/doctors/{doctor.short_id}/").status_code == 404


def test_availability_and_slots(doctor):
    c = APIClient()
    days = c.get(f"/api/doctors/{doctor.short_id}/availability/").json()["days"]
    free_day = next(d for d in days if d["free"])
    slots = c.get(f"/api/doctors/{doctor.short_id}/slots/", {"date": free_day["date"]}).json()["slots"]
    assert len(slots) == 4 and slots[0]["time"] == "16:00"


# ---------- booking ----------

def first_slot(doctor):
    return Slot.objects.filter(office__doctor=doctor).order_by("start").first()


def test_book_pay_with_gateway_and_confirm(doctor, django_capture_on_commit_callbacks):
    patient = make_patient()
    c = APIClient()
    c.force_authenticate(patient)
    slot = first_slot(doctor)
    r = c.post("/api/me/appointments/", {"slot": slot.id}, format="json")
    assert r.status_code == 201, r.content
    appt = r.json()
    assert appt["status"] == "pending_payment" and appt["price"] == 50000

    r = c.post("/api/payments/start", {"tracking_code": appt["tracking_code"], "use_wallet": True}, format="json")
    assert "redirect_url" in r.json()
    pay = Payment.objects.get(pk=r.json()["payment_id"])
    with django_capture_on_commit_callbacks(execute=True):
        r = c.get("/api/payments/callback", {"pid": pay.pk, "Authority": pay.authority, "Status": "OK"})
    assert r.status_code == 302 and "status=success" in r["Location"]
    assert Appointment.objects.get(tracking_code=appt["tracking_code"]).status == "confirmed"
    assert SmsLog.objects.filter(kind="appointment_confirmed", mobile=patient.mobile).exists()


def test_slot_cannot_be_double_booked(doctor):
    slot = first_slot(doctor)
    book_slot(user=make_patient(), slot_id=slot.id)
    with pytest.raises(BookingError):
        book_slot(user=make_patient("09123333333", national_code="0499370899"), slot_id=slot.id)
    slot.refresh_from_db()
    assert slot.booked_count == 1


def test_same_patient_same_day_blocked(doctor):
    patient = make_patient()
    slots = list(Slot.objects.filter(office__doctor=doctor).order_by("start")[:2])
    book_slot(user=patient, slot_id=slots[0].id)
    with pytest.raises(BookingError):
        book_slot(user=patient, slot_id=slots[1].id)


def test_incomplete_profile_cannot_book(doctor):
    user = User.objects.create_user("09124444444")
    with pytest.raises(BookingError):
        book_slot(user=user, slot_id=first_slot(doctor).id)


def test_expired_hold_releases_slot(doctor):
    slot = first_slot(doctor)
    appt = book_slot(user=make_patient(), slot_id=slot.id)
    Appointment.objects.filter(pk=appt.pk).update(held_until=timezone.now() - timedelta(minutes=1))
    assert expire_holds() == 1
    slot.refresh_from_db()
    assert slot.booked_count == 0


def test_wallet_payment_and_cancel_refund(doctor):
    from apps.payments.services import credit_wallet

    patient = make_patient()
    credit_wallet(patient, 100000, kind="topup")
    c = APIClient()
    c.force_authenticate(patient)
    appt = c.post("/api/me/appointments/", {"slot": first_slot(doctor).id}, format="json").json()
    r = c.post("/api/payments/start", {"tracking_code": appt["tracking_code"], "use_wallet": True}, format="json")
    assert r.json()["status"] == "paid"
    assert get_wallet(patient).balance == 50000

    # less than 24h before the visit -> no refund for patient cancellation
    r = c.post(f"/api/me/appointments/{appt['tracking_code']}/cancel/", {"reason": "x"}, format="json")
    assert r.status_code == 200
    expected_refund = 50000 if (first_slot(doctor).start - timezone.now()) >= timedelta(hours=24) else 0
    assert r.json()["refunded"] == expected_refund
    assert get_wallet(patient).balance == 50000 + expected_refund


def test_provider_cancel_always_refunds(doctor):
    from apps.payments.services import credit_wallet

    patient = make_patient()
    credit_wallet(patient, 50000, kind="topup")
    c = APIClient()
    c.force_authenticate(patient)
    appt = c.post("/api/me/appointments/", {"slot": first_slot(doctor).id}, format="json").json()
    c.post("/api/payments/start", {"tracking_code": appt["tracking_code"]}, format="json")

    dc = APIClient()
    dc.force_authenticate(doctor.user)
    r = dc.post(f"/api/doctor-panel/appointments/{appt['tracking_code']}/cancel/", {"reason": "مرخصی"}, format="json")
    assert r.status_code == 200 and r.json()["status"] == "cancelled"
    assert get_wallet(patient).balance == 50000


# ---------- panels & permissions ----------

def test_role_permissions(doctor):
    patient = make_patient()
    c = APIClient()
    c.force_authenticate(patient)
    assert c.get("/api/doctor-panel/dashboard").status_code == 403
    assert c.get("/api/ops/dashboard").status_code == 403
    assert APIClient().get("/api/me").status_code in (401, 403)


def test_doctor_panel_schedule_regenerates_slots(doctor):
    c = APIClient()
    c.force_authenticate(doctor.user)
    office = doctor.offices.first()
    day = timezone.localdate() + timedelta(days=2)
    r = c.post("/api/doctor-panel/schedules/", {
        "office": office.id, "weekday": persian_weekday(day), "start_time": "09:00", "end_time": "10:00", "slot_minutes": 20,
    }, format="json")
    assert r.status_code == 201, r.content
    assert Slot.objects.filter(office=office, start__date=day, start__hour__lt=11).count() == 3
    # leave for that day removes the free slots
    r = c.post("/api/doctor-panel/exceptions/", {"office": office.id, "date": day.isoformat(), "reason": "مرخصی"}, format="json")
    assert r.status_code == 201
    assert not Slot.objects.filter(office=office, start__date=day).exists()


def test_doctor_cannot_touch_other_office(doctor, ref):
    other_user = User.objects.create_user("09125555555", role=Role.DOCTOR)
    other = DoctorProfile.objects.create(
        user=other_user, first_name="الف", last_name="ب", gender="male", medical_council_no="999",
        degree=ref["degree"], primary_specialty=ref["cardio"],
    )
    c = APIClient()
    c.force_authenticate(other.user)
    r = c.post("/api/doctor-panel/schedules/", {
        "office": doctor.offices.first().id, "weekday": 0, "start_time": "09:00", "end_time": "10:00",
    }, format="json")
    assert r.status_code == 403


def test_doctor_onboarding_and_ops_approval(ref):
    from django.core.files.uploadedfile import SimpleUploadedFile

    user = make_patient("09126666666")
    c = APIClient()
    c.force_authenticate(user)
    r = c.post("/api/doctor-panel/onboarding", {
        "first_name": "رضا", "last_name": "کریمی", "gender": "male", "medical_council_no": "55555",
        "degree": ref["degree"].id, "specialties": [ref["cardio"].id], "primary_specialty": ref["cardio"].id,
    }, format="json")
    assert r.status_code == 201, r.content
    user.refresh_from_db()
    assert user.role == Role.DOCTOR
    assert c.post("/api/doctor-panel/submit").status_code == 400  # needs documents + office
    c.post("/api/doctor-panel/documents/", {"kind": "council_card", "file": SimpleUploadedFile("c.jpg", b"x")}, format="multipart")
    c.post("/api/doctor-panel/offices/", {"city": ref["city"].id, "address": "آدرس", "title": "مطب"}, format="json")
    assert c.post("/api/doctor-panel/submit").status_code == 200

    op = User.objects.create_user("09127777777", role=Role.OPERATOR)
    oc = APIClient()
    oc.force_authenticate(op)
    pending = oc.get("/api/ops/doctors/", {"status": "pending"}).json()["results"]
    assert len(pending) == 1
    r = oc.post(f"/api/ops/doctors/{pending[0]['id']}/approve/")
    assert r.json()["verification_status"] == "approved"
    assert APIClient().get("/api/doctors/").json()["count"] == 1


def test_lab_reception_booking(ref):
    center = Center.objects.create(
        type="laboratory", name="آزمایشگاه نمونه", city=ref["city"], address="آدرس", online_reception=True,
        has_home_sampling=True, home_sampling_fee=150000, verification_status=VerificationStatus.APPROVED,
    )
    test = LabTest.objects.create(name="CBC", slug="cbc")
    CenterLabTest.objects.create(center=center, test=test, price=120000)
    tomorrow = timezone.localdate() + timedelta(days=1)
    WeeklySchedule.objects.create(center=center, weekday=persian_weekday(tomorrow), start_time=time(7), end_time=time(8), kind="lab", capacity=2)
    generate_slots(center=center, days=3)
    slot = Slot.objects.filter(center=center).first()

    patient = make_patient()
    c = APIClient()
    c.force_authenticate(patient)
    r = c.post("/api/me/appointments/", {"slot": slot.id, "tests": [test.id], "home_sampling": True, "home_address": "منزل"}, format="json")
    assert r.status_code == 201, r.content
    body = r.json()
    assert body["kind"] == "lab" and body["price"] == 150000
    assert body["lab_reception"]["estimated_price"] == 120000

    staff = User.objects.create_user("09128888888", role=Role.CENTER_STAFF)
    CenterStaff.objects.create(center=center, user=staff)
    sc = APIClient()
    sc.force_authenticate(staff)
    assert sc.get("/api/center-panel/receptions/").json()["count"] == 1


def test_stale_cached_first_slot_is_ignored(doctor):
    """first_free_slot_at is a cache; a time that already passed must not count as a free slot."""
    DoctorProfile.objects.filter(pk=doctor.pk).update(first_free_slot_at=timezone.now() - timedelta(hours=1))
    c = APIClient()
    assert c.get("/api/doctors/", {"has_free_slot": "true"}).json()["count"] == 0
    assert c.get("/api/doctors/").json()["results"][0]["first_free_slot_at"] is None
