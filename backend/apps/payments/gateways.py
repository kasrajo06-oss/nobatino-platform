"""Payment gateway adapters. Amounts are in Toman (IRT)."""
import uuid
from dataclasses import dataclass
from urllib.parse import urlencode

import requests
from django.conf import settings


class GatewayError(Exception):
    pass


@dataclass
class VerifyResult:
    ok: bool
    ref_id: str = ""
    card_pan: str = ""
    error: str = ""


class FakeGateway:
    """Local development gateway: redirects to a frontend page that simulates the bank."""

    name = "fake"

    def request(self, amount, description, callback_url, mobile=""):
        authority = f"FAKE-{uuid.uuid4().hex[:16]}"
        relative_cb = callback_url.removeprefix(settings.API_URL)
        query = urlencode({"authority": authority, "amount": amount, "callback": relative_cb})
        return authority, f"{settings.SITE_URL}/payment/fake-gateway?{query}"

    def verify(self, authority, amount):
        return VerifyResult(ok=True, ref_id=uuid.uuid4().hex[:10].upper(), card_pan="6037********1234")


class ZarinpalGateway:
    name = "zarinpal"

    @property
    def base(self):
        return "https://sandbox.zarinpal.com" if settings.ZARINPAL_SANDBOX else "https://payment.zarinpal.com"

    def request(self, amount, description, callback_url, mobile=""):
        payload = {
            "merchant_id": settings.ZARINPAL_MERCHANT_ID,
            "amount": amount,
            "currency": "IRT",
            "description": description,
            "callback_url": callback_url,
            "metadata": {"mobile": mobile} if mobile else {},
        }
        try:
            r = requests.post(f"{self.base}/pg/v4/payment/request.json", json=payload, timeout=15)
            data = r.json().get("data") or {}
        except (requests.RequestException, ValueError) as e:
            raise GatewayError("ارتباط با درگاه پرداخت برقرار نشد.") from e
        if data.get("code") != 100:
            raise GatewayError(f"خطای درگاه: {r.json().get('errors')}")
        authority = data["authority"]
        return authority, f"{self.base}/pg/StartPay/{authority}"

    def verify(self, authority, amount):
        payload = {"merchant_id": settings.ZARINPAL_MERCHANT_ID, "amount": amount, "authority": authority}
        try:
            r = requests.post(f"{self.base}/pg/v4/payment/verify.json", json=payload, timeout=15)
            data = r.json().get("data") or {}
        except (requests.RequestException, ValueError):
            return VerifyResult(ok=False, error="ارتباط با درگاه برای تأیید برقرار نشد.")
        if data.get("code") in (100, 101):
            return VerifyResult(ok=True, ref_id=str(data.get("ref_id", "")), card_pan=data.get("card_pan", ""))
        return VerifyResult(ok=False, error=str(r.json().get("errors")))


def get_gateway():
    return ZarinpalGateway() if settings.PAYMENT_GATEWAY == "zarinpal" else FakeGateway()
