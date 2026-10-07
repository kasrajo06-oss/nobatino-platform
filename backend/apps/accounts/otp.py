"""One-time-password login (mobile + SMS code), stored in the Django cache (Redis in production)."""
import hashlib
import hmac

from django.conf import settings
from django.core.cache import cache

from apps.core.utils import generate_numeric_code


class OtpError(Exception):
    pass


def _key(mobile):
    return f"otp:{mobile}"


def _hash(mobile, code):
    return hmac.new(settings.SECRET_KEY.encode(), f"{mobile}:{code}".encode(), hashlib.sha256).hexdigest()


def request_otp(mobile: str) -> int:
    """Create a code and queue the SMS. Returns seconds until a resend is allowed."""
    if cache.get(f"otp-lock:{mobile}"):
        raise OtpError("کد قبلاً ارسال شده است؛ کمی صبر کنید.")
    code = generate_numeric_code(settings.OTP_LENGTH)
    cache.set(_key(mobile), {"hash": _hash(mobile, code), "attempts": 0}, settings.OTP_TTL_SECONDS)
    cache.set(f"otp-lock:{mobile}", 1, settings.OTP_RESEND_SECONDS)

    from apps.notifications.tasks import send_otp_sms

    send_otp_sms.delay(mobile, code)
    return settings.OTP_RESEND_SECONDS


def verify_otp(mobile: str, code: str) -> None:
    data = cache.get(_key(mobile))
    if not data:
        raise OtpError("کد منقضی شده است؛ دوباره درخواست دهید.")
    if data["attempts"] >= settings.OTP_MAX_ATTEMPTS:
        cache.delete(_key(mobile))
        raise OtpError("تعداد تلاش‌ها بیش از حد مجاز است.")
    if not hmac.compare_digest(data["hash"], _hash(mobile, code)):
        data["attempts"] += 1
        cache.set(_key(mobile), data, settings.OTP_TTL_SECONDS)
        raise OtpError("کد وارد شده صحیح نیست.")
    cache.delete(_key(mobile))
    cache.delete(f"otp-lock:{mobile}")
