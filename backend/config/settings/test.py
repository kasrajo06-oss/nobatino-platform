from .base import *  # noqa: F401,F403

DEBUG = False
JWT_COOKIE_SECURE = False
CELERY_TASK_ALWAYS_EAGER = True
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
PAYMENT_GATEWAY = "fake"
SMS_BACKEND = "apps.notifications.sms.ConsoleSmsBackend"
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"otp_request": "1000/min", "otp_verify": "1000/min", "anon": "10000/min"}}  # noqa: F405
