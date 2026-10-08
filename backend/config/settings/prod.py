from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import PAYMENT_GATEWAY, SENTRY_DSN, SMS_BACKEND, STAGING, env

DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)
JWT_COOKIE_SECURE = True

if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)

if STAGING:
    # Private test server (protected by nginx basic auth): no SMS provider yet, so show the OTP on screen.
    OTP_SHOW_CODE = True
else:
    # Public production: refuse development stubs.
    OTP_SHOW_CODE = False
    if PAYMENT_GATEWAY == "fake":
        raise ImproperlyConfigured("PAYMENT_GATEWAY=fake is only allowed with STAGING=true (set Zarinpal credentials).")
    if SMS_BACKEND.endswith("ConsoleSmsBackend"):
        raise ImproperlyConfigured("Console SMS is only allowed with STAGING=true (configure Kavenegar or sms.ir).")
