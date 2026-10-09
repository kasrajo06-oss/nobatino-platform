"""Operator (admin) panel API."""
from datetime import timedelta

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import Role, User
from apps.catalog.models import Condition, Insurance, Specialty
from apps.centers.models import Center
from apps.core.permissions import IsOperator
from apps.doctors.models import DoctorProfile, VerificationStatus
from apps.geo.models import City
from apps.lab.models import LabTest
from apps.notifications.models import SmsLog
from apps.notifications.tasks import send_sms
from apps.payments.models import Payment, Settlement
from apps.payments.serializers import PaymentSerializer, SettlementSerializer
from apps.payments.services import credit_wallet, get_wallet
from apps.reviews.models import Review
from apps.reviews.serializers import ReviewSerializer
from apps.reviews.tasks import refresh_stats_for
from apps.scheduling.models import Appointment
from apps.scheduling.serializers import AppointmentSerializer
from apps.scheduling.services import BookingError, cancel_appointment, generate_slots
from apps.scheduling.views import appointment_queryset

from .audit import audit
from .models import AuditLog


class DashboardView(APIView):
    permission_classes = [IsOperator]

    def get(self, request):
        today = timezone.localdate()
        since = today - timedelta(days=29)
        appts = Appointment.objects.filter(created_at__date__gte=since)
        per_day = {
            r["d"]: r for r in appts.annotate(d=TruncDate("created_at", tzinfo=timezone.get_current_timezone()))
            .values("d").annotate(n=Count("id"), paid=Sum("paid_amount"))
        }
        series = []
        for i in range(30):
            d = since + timedelta(days=i)
            r = per_day.get(d, {})
            series.append({"date": d.isoformat(), "appointments": r.get("n", 0), "revenue": r.get("paid") or 0})
        return Response(
            {
                "users": User.objects.count(),
                "new_users_today": User.objects.filter(date_joined__date=today).count(),
                "doctors_approved": DoctorProfile.objects.filter(verification_status="approved").count(),
                "doctors_pending": DoctorProfile.objects.filter(verification_status="pending").count(),
                "centers_pending": Center.objects.filter(verification_status="pending").count(),
                "reviews_pending": Review.objects.filter(status="pending").count(),
                "settlements_pending": Settlement.objects.filter(status="requested").count(),
                "appointments_today": Appointment.objects.filter(start__date=today, status__in=["confirmed", "attended"]).count(),
                "revenue_30d": appts.aggregate(s=Sum("paid_amount"))["s"] or 0,
                "series": series,
            }
        )


class OpsUserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "mobile", "full_name", "first_name", "last_name", "national_code", "role", "is_active", "date_joined", "last_login"]
        read_only_fields = ["id", "mobile", "date_joined", "last_login"]


class UserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = OpsUserSerializer
    http_method_names = ["get", "patch"]

    def get_queryset(self):
        qs = User.objects.order_by("-date_joined")
        p = self.request.query_params
        if p.get("q"):
            qs = qs.filter(Q(mobile__contains=p["q"]) | Q(first_name__icontains=p["q"]) | Q(last_name__icontains=p["q"]) | Q(national_code=p["q"]))
        if p.get("role"):
            qs = qs.filter(role=p["role"])
        return qs

    def perform_update(self, serializer):
        if serializer.validated_data.get("role") == Role.SUPERADMIN and not self.request.user.is_superuser:
            raise serializers.ValidationError({"role": "فقط مدیر کل می‌تواند این نقش را بدهد."})
        user = serializer.save()
        audit(self.request, "ops_update_user", user, **{k: str(v) for k, v in serializer.validated_data.items()})

    @action(detail=True, methods=["post"])
    def wallet_adjust(self, request, pk=None):
        user = self.get_object()
        amount = int(request.data.get("amount", 0))
        reason = request.data.get("reason", "")
        if amount <= 0 or not reason:
            return Response({"detail": "مبلغ مثبت و دلیل الزامی است."}, status=400)
        credit_wallet(user, amount, kind="adjust", description=f"اصلاح پشتیبانی: {reason}")
        audit(request, "wallet_adjust", user, amount=amount, reason=reason)
        return Response({"balance": get_wallet(user).balance})


class OpsDoctorSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    mobile = serializers.CharField(source="user.mobile", read_only=True)
    specialty = serializers.CharField(source="primary_specialty.name", read_only=True)
    documents = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_verification_status_display", read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id", "short_id", "slug", "full_name", "mobile", "medical_council_no", "specialty", "verification_status",
            "status_display", "rejection_reason", "is_active", "rating_avg", "review_count", "successful_appointments",
            "documents", "created_at",
        ]
        read_only_fields = [f for f in fields if f not in ("is_active",)]

    def get_documents(self, obj):
        return [{"kind": d.get_kind_display(), "url": d.file.url} for d in obj.documents.all()]


class _VerifyActions:
    def _set_status(self, request, obj, new_status, reason=""):
        obj.verification_status = new_status
        obj.rejection_reason = reason
        obj.save(update_fields=["verification_status", "rejection_reason", "updated_at"])
        audit(request, f"verify_{new_status}", obj, reason=reason)
        from apps.notifications.inbox import notify_many
        from apps.notifications.models import Notification

        is_doctor = isinstance(obj, DoctorProfile)
        users = [obj.user] if is_doctor else [s.user for s in obj.staff.select_related("user")]
        link = "/doctor-panel/profile" if is_doctor else "/center-panel/profile"
        if new_status == VerificationStatus.APPROVED:
            notify_many(users, Notification.Kind.ACCOUNT, "پروفایل شما تأیید شد", "اکنون در سایت نمایش داده می‌شوید.", link)
        elif new_status == VerificationStatus.REJECTED:
            notify_many(users, Notification.Kind.ACCOUNT, "پروفایل شما تأیید نشد", reason, link)
        return obj

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        obj = self._set_status(request, self.get_object(), VerificationStatus.APPROVED)
        self.after_approve(obj)
        return Response(self.get_serializer(obj).data)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        reason = request.data.get("reason", "")
        if not reason:
            return Response({"detail": "دلیل رد را وارد کنید."}, status=400)
        obj = self._set_status(request, self.get_object(), VerificationStatus.REJECTED, reason)
        return Response(self.get_serializer(obj).data)


class OpsDoctorViewSet(_VerifyActions, viewsets.ModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = OpsDoctorSerializer
    http_method_names = ["get", "patch", "post"]

    def get_queryset(self):
        qs = DoctorProfile.objects.select_related("user", "primary_specialty").prefetch_related("documents").order_by("-created_at")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(verification_status=p["status"])
        if p.get("q"):
            qs = qs.filter(Q(search_text__icontains=p["q"]) | Q(user__mobile__contains=p["q"]) | Q(medical_council_no=p["q"]))
        return qs

    def after_approve(self, doctor):
        for office in doctor.offices.filter(is_active=True):
            generate_slots(office=office)
        send_sms.delay(doctor.user.mobile, "پروفایل پزشکی شما تأیید شد و در سایت نمایش داده می‌شود.", "doctor_approved")


class OpsCenterSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    city_name = serializers.CharField(source="city.name", read_only=True)
    status_display = serializers.CharField(source="get_verification_status_display", read_only=True)

    class Meta:
        model = Center
        fields = [
            "id", "slug", "name", "type", "type_display", "city_name", "phone", "verification_status", "status_display",
            "rejection_reason", "is_active", "online_reception", "created_at",
        ]
        read_only_fields = [f for f in fields if f not in ("is_active", "online_reception")]


class OpsCenterViewSet(_VerifyActions, viewsets.ModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = OpsCenterSerializer
    http_method_names = ["get", "patch", "post"]

    def get_queryset(self):
        qs = Center.objects.select_related("city").order_by("-created_at")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(verification_status=p["status"])
        if p.get("type"):
            qs = qs.filter(type=p["type"])
        if p.get("q"):
            qs = qs.filter(search_text__icontains=p["q"])
        return qs

    def after_approve(self, center):
        generate_slots(center=center)


class OpsAppointmentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = AppointmentSerializer
    lookup_field = "tracking_code"

    def get_queryset(self):
        qs = appointment_queryset()
        p = self.request.query_params
        if p.get("q"):
            q = p["q"]
            qs = qs.filter(Q(tracking_code=q) | Q(patient_mobile__contains=q) | Q(patient_national_code=q) | Q(patient_name__icontains=q))
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("date"):
            qs = qs.filter(start__date=p["date"])
        return qs

    @action(detail=True, methods=["post"])
    def cancel(self, request, tracking_code=None):
        appt = self.get_object()
        reason = request.data.get("reason", "لغو توسط پشتیبانی")
        try:
            appt, refund = cancel_appointment(appt, by=request.user, reason=reason, by_provider=True)
        except BookingError as e:
            return Response({"detail": str(e)}, status=400)
        audit(request, "ops_cancel_appointment", appt, reason=reason, refund=refund)
        return Response({"appointment": AppointmentSerializer(appointment_queryset().get(pk=appt.pk)).data, "refunded": refund})


class OpsReviewViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related("doctor", "center", "appointment", "user")
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

    def _moderate(self, request, new_status):
        review = self.get_object()
        review.status = new_status
        review.save(update_fields=["status", "updated_at"])
        refresh_stats_for.delay(doctor_id=review.doctor_id, center_id=review.center_id)
        audit(request, f"review_{new_status}", review)
        if new_status == Review.Status.APPROVED and review.doctor_id:
            from apps.notifications.inbox import notify
            from apps.notifications.models import Notification

            notify(review.doctor.user, Notification.Kind.REVIEW, f"نظر جدید ({review.rating} ستاره)", review.text[:120], "/doctor-panel/reviews")
        return Response(ReviewSerializer(review).data)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._moderate(request, Review.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._moderate(request, Review.Status.REJECTED)


class OpsSettlementViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = SettlementSerializer

    def get_queryset(self):
        qs = Settlement.objects.select_related("doctor", "center")
        st = self.request.query_params.get("status")
        return qs.filter(status=st) if st else qs

    def _process(self, request, new_status):
        s = self.get_object()
        if s.status != Settlement.Status.REQUESTED:
            return Response({"detail": "این درخواست قبلاً بررسی شده است."}, status=400)
        s.status = new_status
        s.bank_ref = request.data.get("bank_ref", "")
        s.note = request.data.get("note", "")
        s.processed_by = request.user
        s.processed_at = timezone.now()
        s.save()
        audit(request, f"settlement_{new_status}", s, amount=s.amount)
        from apps.notifications.inbox import notify_many
        from apps.notifications.models import Notification

        users = [s.doctor.user] if s.doctor_id else [m.user for m in s.center.staff.select_related("user")]
        title = f"تسویه {s.amount:,} تومان واریز شد" if new_status == Settlement.Status.PAID else "درخواست تسویه رد شد"
        notify_many(users, Notification.Kind.FINANCE, title, s.bank_ref or s.note, "/doctor-panel/finance" if s.doctor_id else "/center-panel/finance")
        return Response(SettlementSerializer(s).data)

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        if not request.data.get("bank_ref"):
            return Response({"detail": "کد پیگیری واریز را وارد کنید."}, status=400)
        return self._process(request, Settlement.Status.PAID)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._process(request, Settlement.Status.REJECTED)


class OpsPaymentViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related("appointment")
        p = self.request.query_params
        if p.get("status"):
            qs = qs.filter(status=p["status"])
        if p.get("q"):
            qs = qs.filter(Q(ref_id=p["q"]) | Q(authority=p["q"]) | Q(user__mobile__contains=p["q"]))
        return qs


class SmsLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = SmsLog
        fields = ["id", "mobile", "kind", "text", "status", "error", "created_at"]


class SmsLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = SmsLogSerializer

    def get_queryset(self):
        qs = SmsLog.objects.all()
        m = self.request.query_params.get("mobile")
        return qs.filter(mobile__contains=m) if m else qs


class AuditLogSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source="actor.__str__", default=None)

    class Meta:
        model = AuditLog
        fields = ["id", "actor", "action", "target_type", "target_repr", "data", "ip", "created_at"]


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsOperator]
    serializer_class = AuditLogSerializer

    def get_queryset(self):
        qs = AuditLog.objects.select_related("actor")
        a = self.request.query_params.get("action")
        return qs.filter(action=a) if a else qs


def _catalog_viewset(model_cls, field_list, search_field="name"):
    meta = type("Meta", (), {"model": model_cls, "fields": field_list})
    ser = type(f"{model_cls.__name__}OpsSerializer", (serializers.ModelSerializer,), {"Meta": meta})

    class _VS(viewsets.ModelViewSet):
        permission_classes = [IsOperator]
        serializer_class = ser
        pagination_class = None

        def get_queryset(self):
            qs = model_cls.objects.all()
            q = self.request.query_params.get("q")
            return qs.filter(**{f"{search_field}__icontains": q}) if q else qs

        def perform_destroy(self, instance):
            audit(self.request, "catalog_delete", instance)
            instance.delete()

    _VS.__name__ = f"Ops{model_cls.__name__}ViewSet"
    return _VS


OpsSpecialtyViewSet = _catalog_viewset(Specialty, ["id", "name", "title", "slug", "parent", "icon", "is_popular", "order", "description"])
OpsConditionViewSet = _catalog_viewset(Condition, ["id", "name", "slug", "specialties", "synonyms", "is_popular", "description"])
OpsInsuranceViewSet = _catalog_viewset(Insurance, ["id", "name", "slug", "kind", "order"])
OpsCityViewSet = _catalog_viewset(City, ["id", "name", "slug", "province", "is_popular", "order", "lat", "lng"])
OpsLabTestViewSet = _catalog_viewset(LabTest, ["id", "name", "en_name", "slug", "category", "preparation", "fasting_hours", "result_days"])
