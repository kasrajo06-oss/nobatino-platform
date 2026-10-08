from django.db.models import Prefetch
from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.reviews.models import Review
from apps.reviews.serializers import PublicReviewSerializer
from apps.scheduling.availability import availability_response, slots_response

from .filters import DoctorFilter
from .models import DoctorProfile, Office, VerificationStatus
from .serializers import DoctorCardSerializer, DoctorDetailSerializer


def public_doctors():
    offices = Office.objects.filter(is_active=True).select_related("city", "center").prefetch_related("insurances")
    return (
        DoctorProfile.objects.filter(is_active=True, verification_status=VerificationStatus.APPROVED)
        .select_related("degree", "primary_specialty")
        .prefetch_related("specialties", "consult_services", Prefetch("offices", queryset=offices))
    )


class DoctorViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = DoctorFilter
    lookup_field = "short_id"

    def get_queryset(self):
        qs = public_doctors()
        return qs.distinct() if self.action == "list" else qs

    def get_serializer_class(self):
        return DoctorDetailSerializer if self.action == "retrieve" else DoctorCardSerializer

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "city": self.request.query_params.get("city")}

    def _office(self, doctor):
        office_id = self.request.query_params.get("office")
        offices = doctor.offices.filter(is_active=True, booking_enabled=True)
        office = offices.filter(pk=office_id).first() if office_id else offices.first()
        if not office:
            raise ValidationError({"office": "مطبی با نوبت‌دهی آنلاین یافت نشد."})
        return office

    @action(detail=True)
    def availability(self, request, short_id=None):
        doctor = self.get_object()
        return Response(availability_response(office=self._office(doctor)))

    @action(detail=True)
    def slots(self, request, short_id=None):
        doctor = self.get_object()
        return Response(slots_response(request, office=self._office(doctor)))

    @action(detail=True, url_path="online-availability")
    def online_availability(self, request, short_id=None):
        return Response(availability_response(doctor=self.get_object()))

    @action(detail=True, url_path="online-slots")
    def online_slots(self, request, short_id=None):
        return Response(slots_response(request, doctor=self.get_object()))

    @action(detail=True)
    def reviews(self, request, short_id=None):
        doctor = get_object_or_404(DoctorProfile, short_id=short_id)
        qs = Review.objects.filter(doctor=doctor, status=Review.Status.APPROVED).select_related("user")
        page = self.paginate_queryset(qs)
        return self.get_paginated_response(PublicReviewSerializer(page, many=True).data)

    @action(detail=False)
    def featured(self, request):
        qs = self.filter_queryset(self.get_queryset()).order_by("-popularity")[:12]
        return Response(DoctorCardSerializer(qs, many=True, context={"request": request}).data)
