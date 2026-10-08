from datetime import timedelta

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import FamilyMember
from apps.core.permissions import IsDoctor
from apps.doctors.models import DoctorProfile
from apps.doctors.panel import current_doctor
from apps.scheduling.serializers import ScheduleExceptionSerializer, WeeklyScheduleSerializer
from apps.scheduling.services import BookingError, generate_slots

from . import services
from .models import CallSignal, Consultation, ConsultService
from .serializers import (
    CallSignalSerializer,
    ConsultationSerializer,
    ConsultMessageSerializer,
    ConsultServiceSerializer,
    StartConsultSerializer,
)


def consult_queryset():
    return Consultation.objects.select_related(
        "appointment__doctor__primary_specialty", "appointment__doctor__user", "appointment__user"
    ).prefetch_related("messages")


class ConsultationViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Shared by patient (/me/consultations) and doctor (/doctor-panel/consultations) — scoped by participant."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConsultationSerializer
    lookup_field = "appointment__tracking_code"
    lookup_url_kwarg = "code"
    as_doctor = False

    def get_queryset(self):
        qs = consult_queryset()
        if self.as_doctor:
            qs = qs.filter(appointment__doctor=current_doctor(self.request))
        else:
            qs = qs.filter(appointment__user=self.request.user)
        qs = qs.exclude(appointment__status__in=["expired"])
        state = self.request.query_params.get("state")
        if state:
            qs = qs.filter(state=state)
        if self.as_doctor:
            qs = qs.filter(appointment__status__in=["confirmed", "attended", "cancelled"])
        return qs

    def get_object(self):
        consult = get_object_or_404(consult_queryset(), appointment__tracking_code=self.kwargs["code"])
        if not consult.is_participant(self.request.user):
            raise PermissionDenied("شما به این مشاوره دسترسی ندارید.")
        return consult

    def create(self, request):
        s = StartConsultSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        doctor = get_object_or_404(DoctorProfile, short_id=d["doctor"])
        member = get_object_or_404(FamilyMember, pk=d["family_member"], owner=request.user) if d.get("family_member") else None
        try:
            consult = services.start_consultation(
                user=request.user, doctor=doctor, kind=d["kind"], complaint=d["complaint"], slot_id=d.get("slot"),
                instant=d["instant"], family_member=member,
            )
        except (services.ConsultError, BookingError) as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        return Response(ConsultationSerializer(consult_queryset().get(pk=consult.pk), context={"request": request}).data, status=201)

    def _run(self, fn):
        try:
            fn()
        except services.ConsultError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        consult = consult_queryset().get(pk=self.get_object().pk)
        return Response(ConsultationSerializer(consult, context={"request": self.request}).data)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, code=None):
        consult = self.get_object()
        if request.method == "POST":
            try:
                msg = services.post_message(consult, request.user, request.data.get("text", ""), request.FILES.get("file"))
            except services.ConsultError as e:
                return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
            return Response(ConsultMessageSerializer(msg).data, status=201)
        after = int(request.query_params.get("after") or 0)
        msgs = consult.messages.filter(id__gt=after)
        consult.refresh_from_db()
        return Response({
            "messages": ConsultMessageSerializer(msgs, many=True).data,
            "state": consult.state,
            "appointment_status": consult.appointment.status,
        })

    @action(detail=True, methods=["post"])
    def accept(self, request, code=None):
        consult = self.get_object()
        if not consult.is_doctor(request.user):
            raise PermissionDenied()
        return self._run(lambda: services.activate(consult, request.user))

    @action(detail=True, methods=["post"])
    def close(self, request, code=None):
        consult = self.get_object()
        if not consult.is_doctor(request.user):
            raise PermissionDenied("فقط پزشک می‌تواند مشاوره را پایان دهد.")
        return self._run(lambda: services.close(consult, summary=request.data.get("summary", "")))

    @action(detail=True, methods=["post"])
    def cancel(self, request, code=None):
        consult = self.get_object()
        if consult.is_doctor(request.user):
            raise PermissionDenied()
        try:
            refund = services.cancel_by_patient(consult, request.user, request.data.get("reason", ""))
        except services.ConsultError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"refunded": refund})

    @action(detail=True, methods=["get", "post"])
    def signals(self, request, code=None):
        """WebRTC signaling over HTTP polling (works without websockets)."""
        consult = self.get_object()
        if request.method == "POST":
            if consult.kind == "text":
                return Response({"detail": "مشاوره متنی تماس ندارد."}, status=400)
            if consult.state == Consultation.State.CLOSED or consult.appointment.status != "confirmed":
                return Response({"detail": "این مشاوره فعال نیست."}, status=400)
            kind = request.data.get("kind")
            if kind not in CallSignal.Kind.values:
                return Response({"detail": "نوع سیگنال نامعتبر است."}, status=400)
            if kind == "ring" and consult.is_doctor(request.user) and consult.state == Consultation.State.WAITING:
                services.activate(consult, request.user)
            sig = CallSignal.objects.create(consultation=consult, sender=request.user, kind=kind, payload=request.data.get("payload") or {})
            CallSignal.objects.filter(consultation=consult, created_at__lt=timezone.now() - timedelta(hours=2)).delete()
            return Response(CallSignalSerializer(sig, context={"request": request}).data, status=201)
        after = int(request.query_params.get("after") or 0)
        qs = consult.signals.filter(id__gt=after).exclude(sender=request.user)
        return Response(CallSignalSerializer(qs, many=True, context={"request": request}).data)


class DoctorConsultationViewSet(ConsultationViewSet):
    permission_classes = [IsDoctor]
    as_doctor = True


class ConsultServicesView(APIView):
    """Doctor sets prices / enables phone, text and video consultations."""

    permission_classes = [IsDoctor]

    def get(self, request):
        doctor = current_doctor(request)
        return Response({
            "services": ConsultServiceSerializer(ConsultService.objects.filter(doctor=doctor), many=True).data,
            "is_online_now": doctor.is_online_now,
        })

    def put(self, request):
        doctor = current_doctor(request)
        for item in request.data.get("services", []):
            s = ConsultServiceSerializer(data=item)
            s.is_valid(raise_exception=True)
            ConsultService.objects.update_or_create(doctor=doctor, kind=s.validated_data["kind"], defaults=s.validated_data)
        services.sync_offer_flags(doctor)
        generate_slots(doctor=doctor)
        return self.get(request)


class PresenceView(APIView):
    """Online-now toggle + heartbeat (call every minute while the panel is open)."""

    permission_classes = [IsDoctor]

    def post(self, request):
        doctor = current_doctor(request)
        online = request.data.get("online")
        fields = {"online_seen_at": timezone.now()}
        if online is not None:
            fields["is_online_now"] = bool(online)
        DoctorProfile.objects.filter(pk=doctor.pk).update(**fields)
        doctor.refresh_from_db()
        return Response({"is_online_now": doctor.is_online_now, "available_now": doctor.available_now})


class _DoctorOwnedMixin:
    permission_classes = [IsDoctor]
    pagination_class = None

    def perform_create(self, serializer):
        doctor = current_doctor(self.request)
        serializer.save(doctor=doctor, office=None, **self.extra)
        generate_slots(doctor=doctor)

    def perform_update(self, serializer):
        serializer.save()
        generate_slots(doctor=current_doctor(self.request))

    def perform_destroy(self, instance):
        instance.delete()
        generate_slots(doctor=current_doctor(self.request))


class OnlineScheduleViewSet(_DoctorOwnedMixin, viewsets.ModelViewSet):
    serializer_class = WeeklyScheduleSerializer
    extra = {"kind": "online"}

    def get_queryset(self):
        from apps.scheduling.models import WeeklySchedule

        return WeeklySchedule.objects.filter(doctor=current_doctor(self.request))


class OnlineExceptionViewSet(_DoctorOwnedMixin, viewsets.ModelViewSet):
    serializer_class = ScheduleExceptionSerializer
    extra: dict = {}

    def get_queryset(self):
        from apps.scheduling.models import ScheduleException

        return ScheduleException.objects.filter(doctor=current_doctor(self.request), date__gte=timezone.localdate() - timedelta(days=1))
