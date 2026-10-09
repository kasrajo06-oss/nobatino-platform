"""Public demo: the whole platform in one container (Django + Next.js), SQLite, fake data.

Built by deploy/demo/Dockerfile for free hosts without a domain (Render, Hugging Face, Koyeb...).
Runs as STAGING (on-screen OTP, fake payment, console SMS, noindex) — never use it for real patients.
"""
import os

os.environ.setdefault("STAGING", "true")

from .prod import *  # noqa: E402,F401,F403
from .prod import DATABASES, env  # noqa: E402

# Django only listens on 127.0.0.1; the public port is the Next.js server, which proxies /api and /media.
ALLOWED_HOSTS = ["*"]
# relative links and redirects (/api/private-media?f=..., /payment/result) work on whatever address the host assigns
API_URL = env("API_URL", default="")
SITE_URL = env("SITE_URL", default=env("RENDER_EXTERNAL_URL", default=""))
SERVE_MEDIA = True

# one gunicorn process + the periodic runner share the file: wait for locks instead of failing
DATABASES["default"].setdefault("OPTIONS", {}).update({"timeout": 20, "transaction_mode": "IMMEDIATE"})
DATABASES["default"]["CONN_MAX_AGE"] = 0

# everyone shares the same few demo phone numbers: don't let one visitor's code request block the next for a minute
OTP_RESEND_SECONDS = 5
