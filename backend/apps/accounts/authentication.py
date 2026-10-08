from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
SESSION_FLAG_COOKIE = "has_session"


class CookieJWTAuthentication(JWTAuthentication):
    """Accept the JWT from the Authorization header (mobile apps) or from an httpOnly cookie (web)."""

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            return super().authenticate(request)
        raw = request.COOKIES.get(ACCESS_COOKIE)
        if not raw:
            return None
        try:
            validated = self.get_validated_token(raw)
        except Exception:
            return None
        return self.get_user(validated), validated


def issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    refresh["role"] = user.role
    return str(refresh.access_token), str(refresh)


def set_auth_cookies(response, access, refresh):
    jwt = settings.SIMPLE_JWT
    common = {
        "httponly": True,
        "secure": settings.JWT_COOKIE_SECURE,
        "samesite": "Lax",
        "domain": settings.JWT_COOKIE_DOMAIN,
        "path": "/",
    }
    response.set_cookie(ACCESS_COOKIE, access, max_age=int(jwt["ACCESS_TOKEN_LIFETIME"].total_seconds()), **common)
    response.set_cookie(REFRESH_COOKIE, refresh, max_age=int(jwt["REFRESH_TOKEN_LIFETIME"].total_seconds()), **common)
    response.set_cookie(
        SESSION_FLAG_COOKIE, "1", max_age=int(jwt["REFRESH_TOKEN_LIFETIME"].total_seconds()), **{**common, "httponly": False}
    )
    return response


def clear_auth_cookies(response):
    for name in (ACCESS_COOKIE, REFRESH_COOKIE, SESSION_FLAG_COOKIE):
        response.delete_cookie(name, path="/", domain=settings.JWT_COOKIE_DOMAIN)
    return response
