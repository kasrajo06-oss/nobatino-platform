"""Base settings shared by every environment."""
from datetime import timedelta
from pathlib import Path

import dj_database_url
import environ

BASE_DIR = Path(__file__).resolve().parent.parent.parent

env = environ.Env()
environ.Env.read_env(BASE_DIR / ".env", overwrite=False)

SECRET_KEY = env("DJANGO_SECRET_KEY", default="dev-insecure-change-me")
DEBUG = env.bool("DJANGO_DEBUG", default=False)
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["localhost", "127.0.0.1"])

BRAND_NAME = env("BRAND_NAME", default="نوبتینو")
SITE_URL = env("SITE_URL", default="http://localhost:3000")
API_URL = env("API_URL", default="http://localhost:8000")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # third party
    "rest_framework",
    "rest_framework_simplejwt",
    "django_filters",
    "drf_spectacular",
    "corsheaders",
    # local
    "apps.core",
    "apps.accounts",
    "apps.geo",
    "apps.catalog",
    "apps.doctors",
    "apps.centers",
    "apps.scheduling",
    "apps.lab",
    "apps.reviews",
    "apps.payments",
    "apps.notifications",
    "apps.cms",
    "apps.consult",
    "apps.ops",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]

DATABASES = {
    "default": dj_database_url.config(
        env="DATABASE_URL",
        default=f"sqlite:///{BASE_DIR / 'db.sqlite3'}",
        conn_max_age=60,
    )
}
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
AUTH_USER_MODEL = "accounts.User"

REDIS_URL = env("REDIS_URL", default="")
if REDIS_URL:
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": REDIS_URL,
            "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        }
    }
else:
    CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

LANGUAGE_CODE = "fa"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_URL = "/media/"
MEDIA_ROOT = BASE_DIR / "media"
# medical documents: never served directly, only through signed short-lived links (apps.core.storage)
PRIVATE_MEDIA_ROOT = env("PRIVATE_MEDIA_ROOT", default=str(BASE_DIR / "private_media"))
PRIVATE_URL_MAX_AGE = 60 * 60
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

# Staging = a real server that is not public yet (no SMS provider / payment gateway).
# Allows on-screen OTP, fake payments and console SMS; nginx adds basic-auth + noindex.
STAGING = env.bool("STAGING", default=False)

if env("AWS_STORAGE_BUCKET_NAME", default=""):
    STORAGES = {
        "default": {"BACKEND": "storages.backends.s3.S3Storage"},
        "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
    }
    AWS_STORAGE_BUCKET_NAME = env("AWS_STORAGE_BUCKET_NAME")
    AWS_S3_ENDPOINT_URL = env("AWS_S3_ENDPOINT_URL", default=None)
    AWS_S3_CUSTOM_DOMAIN = env("AWS_S3_CUSTOM_DOMAIN", default=None)
    AWS_ACCESS_KEY_ID = env("AWS_ACCESS_KEY_ID", default=None)
    AWS_SECRET_ACCESS_KEY = env("AWS_SECRET_ACCESS_KEY", default=None)
    AWS_QUERYSTRING_AUTH = False
    AWS_DEFAULT_ACL = None

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ["apps.accounts.authentication.CookieJWTAuthentication"],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "DEFAULT_FILTER_BACKENDS": ["django_filters.rest_framework.DjangoFilterBackend"],
    "DEFAULT_PAGINATION_CLASS": "apps.core.pagination.StandardPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_RATES": {"otp_request": "10/min", "otp_verify": "20/min", "anon": "120/min"},
    "EXCEPTION_HANDLER": "apps.core.exceptions.exception_handler",
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=env.int("JWT_ACCESS_MINUTES", default=30)),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=env.int("JWT_REFRESH_DAYS", default=30)),
    "ROTATE_REFRESH_TOKENS": True,
    "UPDATE_LAST_LOGIN": True,
}
JWT_COOKIE_SECURE = env.bool("JWT_COOKIE_SECURE", default=not DEBUG)
JWT_COOKIE_DOMAIN = env("JWT_COOKIE_DOMAIN", default=None)

SPECTACULAR_SETTINGS = {
    "TITLE": f"{BRAND_NAME} API",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

CORS_ALLOWED_ORIGINS = env.list("CORS_ALLOWED_ORIGINS", default=["http://localhost:3000"])
CORS_ALLOW_CREDENTIALS = True
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS", default=["http://localhost:3000"])

# Celery
CELERY_BROKER_URL = env("CELERY_BROKER_URL", default=REDIS_URL or "memory://")
CELERY_RESULT_BACKEND = None
CELERY_TASK_ALWAYS_EAGER = env.bool("CELERY_TASK_ALWAYS_EAGER", default=not REDIS_URL)
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULE = {
    "generate-slots": {"task": "apps.scheduling.tasks.generate_slots_task", "schedule": 60 * 60},
    "release-expired-holds": {"task": "apps.scheduling.tasks.release_expired_holds", "schedule": 60},
    "appointment-reminders": {"task": "apps.notifications.tasks.send_reminders", "schedule": 15 * 60},
    "refresh-doctor-stats": {"task": "apps.reviews.tasks.refresh_all_stats", "schedule": 30 * 60},
    "expire-consultations": {"task": "apps.consult.tasks.expire_consultations", "schedule": 60},
}

# OTP
OTP_LENGTH = 5
OTP_TTL_SECONDS = 120
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_SECONDS = 60
# Show the OTP on the login page when no SMS provider is configured (never in production)
OTP_SHOW_CODE = env.bool("OTP_SHOW_CODE", default=DEBUG)

# SMS
SMS_BACKEND = env("SMS_BACKEND", default="apps.notifications.sms.ConsoleSmsBackend")
KAVENEGAR_API_KEY = env("KAVENEGAR_API_KEY", default="")
KAVENEGAR_OTP_TEMPLATE = env("KAVENEGAR_OTP_TEMPLATE", default="verify")
SMSIR_API_KEY = env("SMSIR_API_KEY", default="")
SMSIR_OTP_TEMPLATE_ID = env.int("SMSIR_OTP_TEMPLATE_ID", default=0)
SMSIR_LINE_NUMBER = env("SMSIR_LINE_NUMBER", default="")

# Payments
PAYMENT_GATEWAY = env("PAYMENT_GATEWAY", default="fake")  # fake | zarinpal
ZARINPAL_MERCHANT_ID = env("ZARINPAL_MERCHANT_ID", default="")
ZARINPAL_SANDBOX = env.bool("ZARINPAL_SANDBOX", default=True)
PLATFORM_COMMISSION_PERCENT = env.int("PLATFORM_COMMISSION_PERCENT", default=10)

# Booking rules
SLOT_HOLD_MINUTES = 10
SLOT_GENERATION_DAYS = 30
CANCEL_FULL_REFUND_HOURS = 24

LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}

SENTRY_DSN = env("SENTRY_DSN", default="")
