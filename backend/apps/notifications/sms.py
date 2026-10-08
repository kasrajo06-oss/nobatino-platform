import logging

import requests
from django.conf import settings
from django.utils.module_loading import import_string

from .models import SmsLog

log = logging.getLogger(__name__)


class ConsoleSmsBackend:
    """Development backend: prints the SMS (and OTP code) to the server log."""

    def send(self, mobile, text, kind="general"):
        log.warning("SMS to %s [%s]: %s", mobile, kind, text)
        SmsLog.objects.create(mobile=mobile, kind=kind, text=text, status=SmsLog.Status.SENT)

    def send_otp(self, mobile, code):
        self.send(mobile, f"کد ورود شما به {settings.BRAND_NAME}: {code}", kind="otp")


class KavenegarSmsBackend:
    base = "https://api.kavenegar.com/v1"

    def _call(self, endpoint, params, mobile, kind, text):
        try:
            r = requests.post(f"{self.base}/{settings.KAVENEGAR_API_KEY}/{endpoint}.json", data=params, timeout=10)
            body = r.json()
            ok = body.get("return", {}).get("status") == 200
            ref = str((body.get("entries") or [{}])[0].get("messageid", ""))
            SmsLog.objects.create(
                mobile=mobile, kind=kind, text=text, status=SmsLog.Status.SENT if ok else SmsLog.Status.FAILED,
                provider_ref=ref, error="" if ok else str(body.get("return")),
            )
        except (requests.RequestException, ValueError) as e:
            SmsLog.objects.create(mobile=mobile, kind=kind, text=text, status=SmsLog.Status.FAILED, error=str(e)[:255])

    def send(self, mobile, text, kind="general"):
        self._call("sms/send", {"receptor": mobile, "message": text}, mobile, kind, text)

    def send_otp(self, mobile, code):
        # store a masked text in the log; never persist the raw OTP code
        params = {"receptor": mobile, "token": code, "template": settings.KAVENEGAR_OTP_TEMPLATE}
        self._call("verify/lookup", params, mobile, "otp", "کد ورود (lookup)")


class SmsIrBackend:
    """sms.ir v1 API: OTP via verify templates (parameter name CODE), other texts via bulk send."""

    base = "https://api.sms.ir/v1"

    def _post(self, path, payload, mobile, kind, text):
        try:
            r = requests.post(
                f"{self.base}/{path}", json=payload, timeout=10,
                headers={"x-api-key": settings.SMSIR_API_KEY, "Accept": "application/json"},
            )
            body = r.json()
            ok = body.get("status") == 1
            ref = str((body.get("data") or {}).get("messageId") or (body.get("data") or {}).get("packId") or "")
            SmsLog.objects.create(
                mobile=mobile, kind=kind, text=text, status=SmsLog.Status.SENT if ok else SmsLog.Status.FAILED,
                provider_ref=ref, error="" if ok else str(body.get("message"))[:255],
            )
        except (requests.RequestException, ValueError) as e:
            SmsLog.objects.create(mobile=mobile, kind=kind, text=text, status=SmsLog.Status.FAILED, error=str(e)[:255])

    def send(self, mobile, text, kind="general"):
        payload = {"lineNumber": settings.SMSIR_LINE_NUMBER, "messageText": text, "mobiles": [mobile]}
        self._post("send/bulk", payload, mobile, kind, text)

    def send_otp(self, mobile, code):
        payload = {"mobile": mobile, "templateId": settings.SMSIR_OTP_TEMPLATE_ID, "parameters": [{"name": "CODE", "value": code}]}
        self._post("send/verify", payload, mobile, "otp", "کد ورود (verify)")


def get_backend():
    return import_string(settings.SMS_BACKEND)()
