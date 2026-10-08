from django.conf import settings
from rest_framework import permissions, status, viewsets
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.ops.audit import audit

from .authentication import REFRESH_COOKIE, clear_auth_cookies, issue_tokens, set_auth_cookies
from .models import FamilyMember, User
from .otp import OtpError, request_otp, verify_otp
from .serializers import FamilyMemberSerializer, OtpRequestSerializer, OtpVerifySerializer, UserSerializer


class OtpRequestView(APIView):
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_request"

    def post(self, request):
        s = OtpRequestSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        mobile = s.validated_data["mobile"]
        try:
            resend_in, code = request_otp(mobile)
        except OtpError as e:
            return Response({"detail": str(e)}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        data = {
            "mobile": mobile,
            "resend_in": resend_in,
            "expires_in": settings.OTP_TTL_SECONDS,
            "is_registered": User.objects.filter(mobile=mobile).exists(),
        }
        if settings.OTP_SHOW_CODE:
            # Development/demo only: there is no SMS provider, so hand the code to the login page.
            data["debug_code"] = code
        return Response(data)


class OtpVerifyView(APIView):
    authentication_classes: list = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "otp_verify"

    def post(self, request):
        s = OtpVerifySerializer(data=request.data)
        s.is_valid(raise_exception=True)
        mobile, code = s.validated_data["mobile"], s.validated_data["code"]
        try:
            verify_otp(mobile, code)
        except OtpError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        user, created = User.objects.get_or_create(mobile=mobile)
        if not user.is_active:
            return Response({"detail": "حساب کاربری غیرفعال است."}, status=status.HTTP_403_FORBIDDEN)
        if created:
            user.set_unusable_password()
            user.save(update_fields=["password"])
        access, refresh = issue_tokens(user)
        audit(request, "login", user, actor=user)
        resp = Response({"user": UserSerializer(user).data, "is_new": created, "access": access, "refresh": refresh})
        return set_auth_cookies(resp, access, refresh)


class RefreshView(APIView):
    authentication_classes: list = []

    def post(self, request):
        raw = request.data.get("refresh") or request.COOKIES.get(REFRESH_COOKIE)
        if not raw:
            return Response({"detail": "توکن یافت نشد."}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            refresh = RefreshToken(raw)
            user = User.objects.get(pk=refresh["user_id"], is_active=True)
        except (TokenError, User.DoesNotExist):
            return clear_auth_cookies(Response({"detail": "نشست منقضی شده است."}, status=401))
        access, new_refresh = issue_tokens(user)
        resp = Response({"access": access, "refresh": new_refresh})
        return set_auth_cookies(resp, access, new_refresh)


class LogoutView(APIView):
    authentication_classes: list = []

    def post(self, request):
        return clear_auth_cookies(Response(status=status.HTTP_204_NO_CONTENT))


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        s = UserSerializer(request.user, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class FamilyMemberViewSet(viewsets.ModelViewSet):
    serializer_class = FamilyMemberSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        return FamilyMember.objects.filter(owner=self.request.user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)
