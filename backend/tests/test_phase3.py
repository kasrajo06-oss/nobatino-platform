import pytest
from django.core.management import call_command
from rest_framework.test import APIClient

from apps.accounts.models import Role, User
from apps.clinic.models import PackageOrder, ServicePackage
from apps.clinic.services import expire_orders
from apps.magazine.models import Article
from apps.payments.models import Payment
from apps.payments.services import credit_wallet, get_wallet, provider_balance

from .test_flows import doctor, make_patient, ref  # noqa: F401  (pytest fixtures)

pytestmark = pytest.mark.django_db


def client_for(user):
    c = APIClient()
    c.force_authenticate(user)
    return c


# ---------- magazine ----------

def test_magazine_public_and_editor(doctor):  # noqa: F811
    call_command("seed_magazine")
    c = APIClient()
    data = c.get("/api/magazine/articles/").json()
    assert data["count"] == 3
    slug = data["results"][0]["slug"]
    detail = c.get(f"/api/magazine/articles/{slug}/").json()
    assert detail["body"] and detail["reading_minutes"] >= 1
    assert Article.objects.get(slug=slug).views == 1
    cats = c.get("/api/magazine/categories/").json()
    assert any(x["slug"] == "guide" and x["article_count"] == 2 for x in cats)

    # operator writes a draft: invisible until published
    op = client_for(User.objects.create_user("09127770000", role=Role.OPERATOR))
    r = op.post("/api/ops/articles/", {
        "title": "بیماری قلبی و ورزش", "slug": "heart-and-exercise", "category": cats[0]["id"], "excerpt": "خلاصه",
        "body": "## ورزش منظم\n\nمتن", "reviewed_by": doctor.short_id, "status": "draft",
    }, format="json")
    assert r.status_code == 201, r.content
    assert c.get("/api/magazine/articles/heart-and-exercise/").status_code == 404
    op.patch(f"/api/ops/articles/{r.json()['id']}/", {"status": "published"}, format="json")
    pub = c.get("/api/magazine/articles/heart-and-exercise/").json()
    assert pub["reviewed_by"]["short_id"] == doctor.short_id and pub["published_at"]
    assert c.get("/api/magazine/articles/", {"q": "ورزش"}).json()["count"] == 1
    assert APIClient().post("/api/ops/articles/", {}).status_code in (401, 403)


# ---------- service packages ----------

@pytest.fixture
def package(doctor, ref):  # noqa: F811
    office = doctor.offices.first()
    return ServicePackage.objects.create(
        title="جرم‌گیری کامل", slug="scaling", category="dentistry", doctor=doctor, city=ref["city"], address=office.address,
        summary="جرم‌گیری", description="توضیحات", includes="معاینه\nجرم‌گیری", original_price=1_500_000, price=1_000_000,
        status=ServicePackage.Status.APPROVED, max_per_user=2,
    )


def test_package_purchase_wallet_and_redeem(package, doctor):  # noqa: F811
    patient = make_patient()
    credit_wallet(patient, 2_000_000, kind="topup")
    pc = client_for(patient)
    listing = APIClient().get("/api/offers/", {"category": "dentistry"}).json()
    assert listing["results"][0]["discount_percent"] == 33

    order = pc.post("/api/me/package-orders/", {"package": "scaling"}, format="json").json()
    assert order["status"] == "pending_payment" and order["voucher_code"] is None
    r = pc.post(f"/api/me/package-orders/{order['id']}/pay/", {"use_wallet": True}, format="json").json()
    assert r["status"] == "paid"
    voucher = r["voucher_code"]
    assert get_wallet(patient).balance == 1_000_000

    dc = client_for(doctor.user)
    assert dc.post("/api/doctor-panel/packages/redeem/", {"voucher_code": "WRONG"}, format="json").status_code == 400
    ok = dc.post("/api/doctor-panel/packages/redeem/", {"voucher_code": voucher.lower()}, format="json")
    assert ok.status_code == 200 and ok.json()["status"] == "used"
    assert dc.post("/api/doctor-panel/packages/redeem/", {"voucher_code": voucher}, format="json").status_code == 400
    assert provider_balance(doctor=doctor)["gross"] == 1_000_000


def test_package_gateway_payment_and_cancel_refund(package, django_capture_on_commit_callbacks):
    patient = make_patient()
    pc = client_for(patient)
    order = pc.post("/api/me/package-orders/", {"package": "scaling"}, format="json").json()
    r = pc.post(f"/api/me/package-orders/{order['id']}/pay/", {"use_wallet": False}, format="json").json()
    pay = Payment.objects.get(pk=r["payment_id"])
    with django_capture_on_commit_callbacks(execute=True):
        res = pc.get("/api/payments/callback", {"pid": pay.pk, "Authority": pay.authority, "Status": "OK"})
    assert "status=success" in res["Location"] and "package_order=" in res["Location"]
    o = PackageOrder.objects.get(pk=order["id"])
    assert o.status == "paid" and o.expires_at
    package.refresh_from_db()
    assert package.sold_count == 1

    cancel = pc.post(f"/api/me/package-orders/{o.id}/cancel/", {}, format="json").json()
    assert cancel["refunded"] == 1_000_000 and get_wallet(patient).balance == 1_000_000


def test_package_limits_and_approval(package, doctor):  # noqa: F811
    patient = make_patient()
    pc = client_for(patient)
    credit_wallet(patient, 5_000_000, kind="topup")
    for _ in range(2):
        o = pc.post("/api/me/package-orders/", {"package": "scaling"}, format="json").json()
        pc.post(f"/api/me/package-orders/{o['id']}/pay/", {}, format="json")
    assert pc.post("/api/me/package-orders/", {"package": "scaling"}, format="json").status_code == 400  # max_per_user

    # a doctor-created package needs operator approval before it's public
    dc = client_for(doctor.user)
    r = dc.post("/api/doctor-panel/packages/", {
        "title": "ایمپلنت", "category": "dentistry", "city": package.city_id, "address": "آدرس", "summary": "خلاصه",
        "description": "توضیح", "original_price": 30_000_000, "price": 25_000_000,
    }, format="json")
    assert r.status_code == 201 and r.json()["status"] == "pending"
    assert APIClient().get("/api/offers/").json()["count"] == 1
    op = client_for(User.objects.create_user("09127770001", role=Role.OPERATOR))
    op.post(f"/api/ops/packages/{r.json()['id']}/approve/")
    assert APIClient().get("/api/offers/").json()["count"] == 2
    bad = dc.post("/api/doctor-panel/packages/", {
        "title": "x", "category": "dentistry", "city": package.city_id, "address": "a", "summary": "s", "description": "d",
        "original_price": 100, "price": 200,
    }, format="json")
    assert bad.status_code == 400


def test_unpaid_orders_expire(package):
    from datetime import timedelta

    from django.utils import timezone

    patient = make_patient()
    o = client_for(patient).post("/api/me/package-orders/", {"package": "scaling"}, format="json").json()
    PackageOrder.objects.filter(pk=o["id"]).update(held_until=timezone.now() - timedelta(minutes=1))
    assert expire_orders() == (1, 0)
