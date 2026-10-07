from django.core.exceptions import ImproperlyConfigured

from .base import *  # noqa: F401,F403
from .base import PAYMENT_GATEWAY, SENTRY_DSN, SMS_BACKEND, env

DEBUG = False
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_HSTS_SECONDS = env.int("SECURE_HSTS_SECONDS", default=0)

if SENTRY_DSN:
    import sentry_sdk

    sentry_sdk.init(dsn=SENTRY_DSN, traces_sample_rate=0.1)

# Guard against shipping development stubs to production by accident.
if PAYMENT_GATEWAY == "fake" and not env.bool("ALLOW_FAKE_PAYMENTS", default=False):
    raise ImproperlyConfigured("PAYMENT_GATEWAY=fake is not allowed in production (set ZARINPAL credentials).")
if SMS_BACKEND.endswith("ConsoleSmsBackend") and not env.bool("ALLOW_CONSOLE_SMS", default=False):
    raise ImproperlyConfigured("Console SMS backend is not allowed in production (configure Kavenegar).")
