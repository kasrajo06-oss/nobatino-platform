from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.models import FamilyMember
from apps.lab.models import CenterLabTest, LabReception

from .models import Appointment, AppointmentKind, Slot
from .serializers import AppointmentSerializer, BookSerializer, CancelSerializer
from .services import BookingError, book_slot, cancel_appointment


def appointment_queryset():
    return Appointment.objects.select_related(
        "doctor__primary_specialty", "office", "center", "lab_reception", "review", "consultation"
    ).prefetch_related("lab_reception__tests")


class MyAppointmentViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    """Patient-side appointments: book, list (upcoming/past), detail, cancel."""

    permission_classes = [permissions.IsAuthenticated]
    serializer_class = AppointmentSerializer
    lookup_field = "tracking_code"

    def get_queryset(self):
        qs = appointment_queryset().filter(user=self.request.user)
        scope = self.request.query_params.get("scope")
        now = timezone.now()
        if scope == "upcoming":
            qs = qs.filter(start__gte=now, status__in=["pending_payment", "confirmed"]).order_by("start")
        elif scope == "past":
            qs = qs.exclude(start__gte=now, status__in=["pending_payment", "confirmed"])
        kind = self.request.query_params.get("kind")
        return qs.filter(kind=kind) if kind else qs

    def create(self, request, *args, **kwargs):
        s = BookSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        data = s.validated_data
        member = None
        if data.get("family_member"):
            member = get_object_or_404(FamilyMember, pk=data["family_member"], owner=request.user)

        slot = get_object_or_404(Slot.objects.select_related("center"), pk=data["slot"])
        extra_price, lab_tests = 0, []
        if slot.center_id:
            lab_tests = list(CenterLabTest.objects.filter(center=slot.center, test_id__in=data.get("tests", []), is_active=True))
            if not lab_tests and not data.get("prescription"):
                raise ValidationError({"tests": "حداقل یک آزمایش انتخاب کنید یا تصویر نسخه را بارگذاری کنید."})
            if data.get("home_sampling"):
                if not slot.center.has_home_sampling:
                    raise ValidationError({"home_sampling": "این مرکز نمونه‌گیری در منزل ندارد."})
                if not data.get("home_address"):
                    raise ValidationError({"home_address": "آدرس نمونه‌گیری را وارد کنید."})
                extra_price = slot.center.home_sampling_fee

        try:
            with transaction.atomic():
                appt = book_slot(
                    user=request.user, slot_id=slot.pk, family_member=member, note=data.get("note", ""),
                    extra_price=extra_price, kind=AppointmentKind.LAB if slot.center_id else AppointmentKind.IN_PERSON,
                )
                if slot.center_id:
                    lab = LabReception.objects.create(
                        appointment=appt,
                        prescription=data.get("prescription"),
                        has_insurance_prescription=data.get("has_insurance_prescription", False),
                        home_sampling=data.get("home_sampling", False),
                        home_address=data.get("home_address", ""),
                        estimated_price=sum(t.price for t in lab_tests),
                    )
                    lab.tests.set([t.test_id for t in lab_tests])
        except BookingError as e:
            return Response({"detail": str(e)}, status=status.HTTP_409_CONFLICT)
        appt = appointment_queryset().get(pk=appt.pk)
        return Response(AppointmentSerializer(appt).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, tracking_code=None):
        appt = self.get_object()
        s = CancelSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        try:
            appt, refund = cancel_appointment(appt, by=request.user, reason=s.validated_data.get("reason", ""))
        except BookingError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return Response({"appointment": AppointmentSerializer(appointment_queryset().get(pk=appt.pk)).data, "refunded": refund})
