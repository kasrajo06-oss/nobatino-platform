"""Center panel API (role=center_staff). Scoped to centers the user is a staff member of."""
from datetime import timedelta

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.core.permissions import IsCenterStaff
from apps.doctors.models import VerificationStatus
from apps.lab.models import CenterLabTest, LabReception
from apps.ops.audit import audit
from apps.payments.models import Settlement
from apps.payments.serializers import SettlementSerializer
from apps.payments.services import provider_balance
from apps.scheduling.models import ScheduleException, WeeklySchedule
from apps.scheduling.serializers import AppointmentSerializer
from apps.scheduling.services import BookingError, cancel_appointment, generate_slots, mark_attendance
from apps.scheduling.views import appointment_queryset

from .models import Center, CenterStaff


def current_center(request) -> Center:
    center_id = request.headers.get("X-Center") or request.query_params.get("center")
    qs = Center.objects.filter(staff__user=request.user)
    center = qs.filter(pk=center_id).first() if center_id else qs.first()
    if center is None:
        raise PermissionDenied("مرکزی برای این کاربر یافت نشد.")
    return center


class CenterWriteSerializer(serializers.ModelSerializer):
    verification_status_display = serializers.CharField(source="get_verification_status_display", read_only=True)

    class Meta:
        model = Center
        fields = [
            "id", "slug", "type", "name", "city", "address", "lat", "lng", "phone", "website", "description", "logo",
            "cover", "insurances", "specialties", "working_hours", "is_24h", "is_public_sector", "has_home_sampling",
            "online_reception", "reception_fee", "home_sampling_fee", "verification_status",
            "verification_status_display", "rejection_reason",
        ]
        read_only_fields = ["id", "slug", "verification_status", "rejection_reason"]


class CenterOnboardingView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        s = CenterWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        center = s.save(verification_status=VerificationStatus.PENDING)
        CenterStaff.objects.create(center=center, user=request.user, role=CenterStaff.Role.MANAGER)
        if request.user.role == Role.PATIENT:
            request.user.role = Role.CENTER_STAFF
            request.user.save(update_fields=["role"])
        audit(request, "center_onboarding", center)
        return Response(CenterWriteSerializer(center).data, status=status.HTTP_201_CREATED)


class CenterProfileView(APIView):
    permission_classes = [IsCenterStaff]

    def get(self, request):
        return Response(CenterWriteSerializer(current_center(request)).data)

    def patch(self, request):
        center = current_center(request)
        s = CenterWriteSerializer(center, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        generate_slots(center=center)
        return Response(s.data)


class MyCentersView(APIView):
    permission_classes = [IsCenterStaff]

    def get(self, request):
        qs = Center.objects.filter(staff__user=request.user)
        return Response([{"id": c.id, "name": c.name, "type": c.get_type_display()} for c in qs])


class CenterLabTestWriteSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="test.name", read_only=True)

    class Meta:
        model = CenterLabTest
        fields = ["id", "test", "name", "price", "is_active"]


class LabTestPriceViewSet(viewsets.ModelViewSet):
    permission_classes = [IsCenterStaff]
    serializer_class = CenterLabTestWriteSerializer
    pagination_class = None

    def get_queryset(self):
        return CenterLabTest.objects.filter(center=current_center(self.request)).select_related("test")

    def perform_create(self, serializer):
        serializer.save(center=current_center(self.request))


class CenterScheduleSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source="get_weekday_display", read_only=True)

    class Meta:
        model = WeeklySchedule
        fields = ["id", "weekday", "weekday_display", "start_time", "end_time", "slot_minutes", "capacity", "is_active"]


class CenterExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleException
        fields = ["id", "date", "start_time", "end_time", "reason"]


class _CenterOwned(viewsets.ModelViewSet):
    permission_classes = [IsCenterStaff]
    pagination_class = None

    def perform_create(self, serializer):
        center = current_center(self.request)
        serializer.save(center=center, **self.extra_save)
        generate_slots(center=center)

    def perform_update(self, serializer):
        obj = serializer.save()
        generate_slots(center=obj.center)

    def perform_destroy(self, instance):
        center = instance.center
        instance.delete()
        generate_slots(center=center)


class CenterScheduleViewSet(_CenterOwned):
    serializer_class = CenterScheduleSerializer
    extra_save = {"kind": "lab"}

    def get_queryset(self):
        return WeeklySchedule.objects.filter(center=current_center(self.request))


class CenterExceptionViewSet(_CenterOwned):
    serializer_class = CenterExceptionSerializer
    extra_save: dict = {}

    def get_queryset(self):
        return ScheduleException.objects.filter(center=current_center(self.request), date__gte=timezone.localdate() - timedelta(days=1))


class ReceptionViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsCenterStaff]
    serializer_class = AppointmentSerializer
    lookup_field = "tracking_code"

    def get_queryset(self):
        qs = appointment_queryset().filter(center=current_center(self.request)).exclude(status="expired")
        p = self.request.query_params
        if p.get("date"):
            qs = qs.filter(start__date=p["date"]).order_by("start")
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("q"):
            qs = qs.filter(Q(patient_name__icontains=p["q"]) | Q(tracking_code=p["q"]))
        return qs

    def _act(self, fn):
        try:
            return Response(AppointmentSerializer(fn()).data)
        except BookingError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def attended(self, request, tracking_code=None):
        appt = self.get_object()

        def run():
            a = mark_attendance(appt, True)
            LabReception.objects.filter(appointment=a).update(status=LabReception.Status.SAMPLED)
            return appointment_queryset().get(pk=a.pk)

        return self._act(run)

    @action(detail=True, methods=["post"])
    def no_show(self, request, tracking_code=None):
        return self._act(lambda: mark_attendance(self.get_object(), False))

    @action(detail=True, methods=["post"])
    def cancel(self, request, tracking_code=None):
        appt = self.get_object()
        return self._act(lambda: cancel_appointment(appt, by=request.user, reason=request.data.get("reason", "لغو توسط مرکز"), by_provider=True)[0])

    @action(detail=True, methods=["post"])
    def upload_result(self, request, tracking_code=None):
        appt = self.get_object()
        lab = get_object_or_404(LabReception, appointment=appt)
        f = request.FILES.get("result_file")
        if not f:
            return Response({"detail": "فایل جواب را انتخاب کنید."}, status=status.HTTP_400_BAD_REQUEST)
        lab.result_file = f
        lab.status = LabReception.Status.RESULT_READY
        lab.save()
        from apps.notifications.tasks import send_sms

        send_sms.delay(appt.patient_mobile, f"جواب آزمایش شما ({appt.tracking_code}) در پنل کاربری قابل مشاهده است.", "lab_result")
        return Response(AppointmentSerializer(appointment_queryset().get(pk=appt.pk)).data)


class CenterFinanceView(APIView):
    permission_classes = [IsCenterStaff]

    def get(self, request):
        center = current_center(request)
        return Response({
            **provider_balance(center=center),
            "settlements": SettlementSerializer(Settlement.objects.filter(center=center)[:50], many=True).data,
        })

    def post(self, request):
        center = current_center(request)
        s = SettlementSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if s.validated_data["amount"] > provider_balance(center=center)["available"]:
            return Response({"detail": "مبلغ درخواستی بیش از موجودی قابل برداشت است."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(SettlementSerializer(s.save(center=center)).data, status=status.HTTP_201_CREATED)
