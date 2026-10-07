from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.response import Response

from apps.scheduling.models import Appointment, AppointmentStatus

from .models import Review
from .serializers import ReviewCreateSerializer, ReviewSerializer


class MyReviewViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Review.objects.filter(user=self.request.user).select_related("doctor", "center", "appointment")

    def get_serializer_class(self):
        return ReviewCreateSerializer if self.action == "create" else ReviewSerializer

    def create(self, request, *args, **kwargs):
        s = ReviewCreateSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        appt = get_object_or_404(Appointment, pk=s.validated_data.pop("appointment"), user=request.user)
        if appt.status != AppointmentStatus.ATTENDED:
            return Response({"detail": "فقط پس از مراجعه می‌توانید نظر ثبت کنید."}, status=status.HTTP_400_BAD_REQUEST)
        if hasattr(appt, "review"):
            return Response({"detail": "برای این نوبت قبلاً نظر ثبت کرده‌اید."}, status=status.HTTP_400_BAD_REQUEST)
        review = Review.objects.create(
            appointment=appt, user=request.user, doctor=appt.doctor, center=appt.center, **s.validated_data
        )
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)
