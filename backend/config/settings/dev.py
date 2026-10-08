from .base import *  # noqa: F401,F403

DEBUG = True
JWT_COOKIE_SECURE = False
OTP_SHOW_CODE = True

# local development / automated browser tests log in many times from one IP
REST_FRAMEWORK = {**REST_FRAMEWORK, "DEFAULT_THROTTLE_RATES": {"otp_request": "300/min", "otp_verify": "300/min", "anon": "10000/min"}}  # noqa: F405
