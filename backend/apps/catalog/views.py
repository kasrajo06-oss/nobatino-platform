from rest_framework import viewsets

from .models import Condition, Degree, Insurance, Specialty
from .serializers import ConditionSerializer, DegreeSerializer, InsuranceSerializer, SpecialtySerializer


class _ReadOnlyBySlug(viewsets.ReadOnlyModelViewSet):
    pagination_class = None
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"


class SpecialtyViewSet(_ReadOnlyBySlug):
    serializer_class = SpecialtySerializer
    filterset_fields = ["is_popular"]

    def get_queryset(self):
        qs = Specialty.objects.prefetch_related("children")
        if self.action == "list" and self.request.query_params.get("all") != "1":
            qs = qs.filter(parent__isnull=True)
        return qs


class DegreeViewSet(_ReadOnlyBySlug):
    queryset = Degree.objects.all()
    serializer_class = DegreeSerializer


class ConditionViewSet(_ReadOnlyBySlug):
    queryset = Condition.objects.prefetch_related("specialties")
    serializer_class = ConditionSerializer
    filterset_fields = ["is_popular"]


class InsuranceViewSet(_ReadOnlyBySlug):
    queryset = Insurance.objects.all()
    serializer_class = InsuranceSerializer
    filterset_fields = ["kind"]
