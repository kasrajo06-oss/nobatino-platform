"""Doctor panel API (role=doctor). Every queryset is scoped to request.user.doctor_profile."""
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role
from apps.catalog.models import Specialty
from apps.core.permissions import IsDoctor
from apps.ops.audit import audit
from apps.payments.models import Settlement
from apps.payments.serializers import SettlementSerializer
from apps.payments.services import provider_balance
from apps.reviews.models import Review
from apps.reviews.serializers import ReviewSerializer
from apps.scheduling.models import Appointment, ScheduleException, WeeklySchedule
from apps.scheduling.serializers import (
    AppointmentSerializer,
    ScheduleExceptionSerializer,
    WeeklyScheduleSerializer,
)
from apps.scheduling.services import BookingError, cancel_appointment, generate_slots, mark_attendance
from apps.scheduling.views import appointment_queryset

from .models import DoctorDocument, DoctorProfile, Office, VerificationStatus


def current_doctor(request) -> DoctorProfile:
    doctor = getattr(request.user, "doctor_profile", None)
    if doctor is None:
        raise PermissionDenied("پروفایل پزشک یافت نشد.")
    return doctor


class DoctorProfileWriteSerializer(serializers.ModelSerializer):
    specialties = serializers.PrimaryKeyRelatedField(queryset=Specialty.objects.all(), many=True)
    full_name = serializers.CharField(read_only=True)
    verification_status_display = serializers.CharField(source="get_verification_status_display", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id", "short_id", "slug", "full_name", "first_name", "last_name", "gender", "medical_council_no", "degree",
            "specialties", "primary_specialty", "bio", "photo", "experience_start_year", "offers_phone",
            "offers_text", "offers_video", "offers_instant", "verification_status", "verification_status_display",
            "rejection_reason", "rating_avg", "review_count", "successful_appointments",
        ]
        read_only_fields = [
            "id", "short_id", "slug", "verification_status", "rejection_reason", "rating_avg", "review_count",
            "successful_appointments",
        ]

    def validate(self, attrs):
        specs = attrs.get("specialties")
        primary = attrs.get("primary_specialty")
        if specs is not None and primary is not None and primary not in specs:
            raise serializers.ValidationError({"primary_specialty": "تخصص اصلی باید جزو تخصص‌های انتخاب‌شده باشد."})
        return attrs


class OnboardingView(APIView):
    """A logged-in user applies to become a doctor. Profile stays hidden until an operator approves it."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        if hasattr(request.user, "doctor_profile"):
            return Response({"detail": "پروفایل پزشک قبلاً ایجاد شده است."}, status=status.HTTP_400_BAD_REQUEST)
        s = DoctorProfileWriteSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        doctor = s.save(user=request.user, verification_status=VerificationStatus.DRAFT)
        if request.user.role == Role.PATIENT:
            request.user.role = Role.DOCTOR
            request.user.save(update_fields=["role"])
        audit(request, "doctor_onboarding", doctor)
        return Response(DoctorProfileWriteSerializer(doctor).data, status=status.HTTP_201_CREATED)


class ProfileView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        return Response(DoctorProfileWriteSerializer(current_doctor(request)).data)

    def patch(self, request):
        doctor = current_doctor(request)
        s = DoctorProfileWriteSerializer(doctor, data=request.data, partial=True)
        s.is_valid(raise_exception=True)
        s.save()
        return Response(s.data)


class SubmitForReviewView(APIView):
    permission_classes = [IsDoctor]

    def post(self, request):
        doctor = current_doctor(request)
        if not doctor.documents.filter(kind=DoctorDocument.Kind.COUNCIL_CARD).exists():
            return Response({"detail": "بارگذاری تصویر کارت نظام پزشکی الزامی است."}, status=status.HTTP_400_BAD_REQUEST)
        if not doctor.offices.exists():
            return Response({"detail": "حداقل یک مطب ثبت کنید."}, status=status.HTTP_400_BAD_REQUEST)
        doctor.verification_status = VerificationStatus.PENDING
        doctor.rejection_reason = ""
        doctor.save(update_fields=["verification_status", "rejection_reason"])
        audit(request, "doctor_submit_review", doctor)
        return Response({"verification_status": doctor.verification_status})


class DocumentSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = DoctorDocument
        fields = ["id", "kind", "kind_display", "file", "created_at"]


class DocumentViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDoctor]
    serializer_class = DocumentSerializer
    pagination_class = None
    http_method_names = ["get", "post", "delete"]

    def get_queryset(self):
        return DoctorDocument.objects.filter(doctor=current_doctor(self.request))

    def perform_create(self, serializer):
        serializer.save(doctor=current_doctor(self.request))


class OfficeWriteSerializer(serializers.ModelSerializer):
    city_name = serializers.CharField(source="city.name", read_only=True)

    class Meta:
        model = Office
        fields = [
            "id", "title", "center", "city", "city_name", "address", "lat", "lng", "phone", "insurances", "visit_fee",
            "booking_fee", "booking_enabled", "notes", "is_active",
        ]


class OfficeViewSet(viewsets.ModelViewSet):
    permission_classes = [IsDoctor]
    serializer_class = OfficeWriteSerializer
    pagination_class = None

    def get_queryset(self):
        return Office.objects.filter(doctor=current_doctor(self.request)).select_related("city")

    def perform_create(self, serializer):
        serializer.save(doctor=current_doctor(self.request))

    def perform_update(self, serializer):
        office = serializer.save()
        generate_slots(office=office)


class _OwnedOfficeMixin:
    def _check_office(self, office):
        if office is None or office.doctor_id != current_doctor(self.request).id:
            raise PermissionDenied("این مطب متعلق به شما نیست.")

    def perform_create(self, serializer):
        self._check_office(serializer.validated_data.get("office"))
        obj = serializer.save()
        generate_slots(office=obj.office)

    def perform_update(self, serializer):
        self._check_office(serializer.validated_data.get("office", serializer.instance.office))
        obj = serializer.save()
        generate_slots(office=obj.office)

    def perform_destroy(self, instance):
        office = instance.office
        instance.delete()
        generate_slots(office=office)


class ScheduleViewSet(_OwnedOfficeMixin, viewsets.ModelViewSet):
    permission_classes = [IsDoctor]
    serializer_class = WeeklyScheduleSerializer
    pagination_class = None

    def get_queryset(self):
        qs = WeeklySchedule.objects.filter(office__doctor=current_doctor(self.request))
        office = self.request.query_params.get("office")
        return qs.filter(office_id=office) if office else qs


class ExceptionViewSet(_OwnedOfficeMixin, viewsets.ModelViewSet):
    permission_classes = [IsDoctor]
    serializer_class = ScheduleExceptionSerializer
    pagination_class = None

    def get_queryset(self):
        return ScheduleException.objects.filter(
            office__doctor=current_doctor(self.request), date__gte=timezone.localdate() - timedelta(days=1)
        )


class AppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsDoctor]
    serializer_class = AppointmentSerializer
    lookup_field = "tracking_code"

    def get_queryset(self):
        qs = appointment_queryset().filter(doctor=current_doctor(self.request)).exclude(status="expired")
        p = self.request.query_params
        if p.get("date"):
            qs = qs.filter(start__date=p["date"])
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("office"):
            qs = qs.filter(office_id=p["office"])
        if p.get("q"):
            qs = qs.filter(Q(patient_name__icontains=p["q"]) | Q(tracking_code=p["q"]) | Q(patient_national_code=p["q"]))
        return qs.order_by("start") if p.get("date") else qs

    def _act(self, fn):
        try:
            return Response(AppointmentSerializer(fn()).data)
        except BookingError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=["post"])
    def attended(self, request, tracking_code=None):
        return self._act(lambda: mark_attendance(self.get_object(), True))

    @action(detail=True, methods=["post"])
    def no_show(self, request, tracking_code=None):
        return self._act(lambda: mark_attendance(self.get_object(), False))

    @action(detail=True, methods=["post"])
    def cancel(self, request, tracking_code=None):
        appt = self.get_object()
        reason = request.data.get("reason", "لغو توسط پزشک")

        def run():
            a, _ = cancel_appointment(appt, by=request.user, reason=reason, by_provider=True)
            audit(request, "doctor_cancel_appointment", a, reason=reason)
            return appointment_queryset().get(pk=a.pk)

        return self._act(run)


class ReviewViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsDoctor]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        return Review.objects.filter(doctor=current_doctor(self.request), status=Review.Status.APPROVED).select_related(
            "user", "appointment"
        )

    @action(detail=True, methods=["post"])
    def reply(self, request, pk=None):
        review = self.get_object()
        review.reply = (request.data.get("reply") or "").strip()[:2000]
        review.replied_at = timezone.now()
        review.save(update_fields=["reply", "replied_at", "updated_at"])
        if review.reply:
            from apps.notifications.inbox import notify
            from apps.notifications.models import Notification

            notify(review.user, Notification.Kind.REVIEW, f"{review.doctor.full_name} به نظر شما پاسخ داد", review.reply[:120], "/panel/reviews")
        return Response(ReviewSerializer(review).data)


class FinanceView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = current_doctor(request)
        settlements = Settlement.objects.filter(doctor=doctor)[:50]
        return Response({**provider_balance(doctor=doctor), "settlements": SettlementSerializer(settlements, many=True).data})

    def post(self, request):
        doctor = current_doctor(request)
        s = SettlementSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        if s.validated_data["amount"] > provider_balance(doctor=doctor)["available"]:
            return Response({"detail": "مبلغ درخواستی بیش از موجودی قابل برداشت است."}, status=status.HTTP_400_BAD_REQUEST)
        settlement = s.save(doctor=doctor)
        audit(request, "settlement_request", settlement, amount=settlement.amount)
        return Response(SettlementSerializer(settlement).data, status=status.HTTP_201_CREATED)


class DashboardView(APIView):
    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = current_doctor(request)
        today = timezone.localdate()
        base = Appointment.objects.filter(doctor=doctor)
        week = [today + timedelta(days=i) for i in range(7)]
        per_day = dict(
            base.filter(start__date__in=week, status__in=["confirmed", "attended"])
            .values_list("start__date")
            .annotate(n=Count("id"))
        )
        return Response(
            {
                "today_total": base.filter(start__date=today, status__in=["confirmed", "attended", "no_show"]).count(),
                "today_attended": base.filter(start__date=today, status="attended").count(),
                "upcoming": base.filter(start__gte=timezone.now(), status="confirmed").count(),
                "month_revenue": base.filter(
                    start__date__gte=today.replace(day=1), status__in=["confirmed", "attended", "no_show"]
                ).aggregate(s=Sum("paid_amount"))["s"] or 0,
                "rating_avg": doctor.rating_avg,
                "review_count": doctor.review_count,
                "first_free_slot_at": doctor.first_free_slot_at,
                "week": [{"date": d.isoformat(), "count": per_day.get(d, 0)} for d in week],
                "verification_status": doctor.verification_status,
            }
        )


class EndorseView(APIView):
    """A doctor endorses a colleague (تأیید همکار)."""

    permission_classes = [IsDoctor]

    def post(self, request, short_id):
        from .models import Endorsement

        me = current_doctor(request)
        if me.verification_status != VerificationStatus.APPROVED:
            return Response({"detail": "فقط پزشکان تأییدشده می‌توانند همکار را تأیید کنند."}, status=403)
        target = get_object_or_404(DoctorProfile, short_id=short_id)
        if target == me:
            return Response({"detail": "امکان تأیید خودتان وجود ندارد."}, status=400)
        Endorsement.objects.get_or_create(from_doctor=me, to_doctor=target)
        DoctorProfile.objects.filter(pk=target.pk).update(endorsement_count=target.endorsements_received.count())
        return Response({"ok": True})
