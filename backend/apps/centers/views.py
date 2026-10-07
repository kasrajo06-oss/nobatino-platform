from django_filters import rest_framework as filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.core.utils import normalize_fa
from apps.doctors.models import VerificationStatus
from apps.scheduling.availability import availability_response, slots_response

from .models import Center, CenterType
from .serializers import CenterCardSerializer, CenterDetailSerializer


class CenterFilter(filters.FilterSet):
    type = filters.ChoiceFilter(choices=CenterType.choices)
    city = filters.CharFilter(field_name="city__slug")
    province = filters.CharFilter(field_name="city__province__slug")
    insurance = filters.CharFilter(field_name="insurances__slug")
    specialty = filters.CharFilter(field_name="specialties__slug")
    q = filters.CharFilter(method="filter_q")
    online_reception = filters.BooleanFilter()
    has_home_sampling = filters.BooleanFilter()
    is_24h = filters.BooleanFilter()

    class Meta:
        model = Center
        fields: list[str] = []

    def filter_q(self, qs, name, value):
        for word in normalize_fa(value).split():
            qs = qs.filter(search_text__contains=word)
        return qs


class CenterViewSet(viewsets.ReadOnlyModelViewSet):
    filterset_class = CenterFilter
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"

    def get_queryset(self):
        qs = Center.objects.filter(is_active=True, verification_status=VerificationStatus.APPROVED).select_related(
            "city__province"
        )
        if self.action == "retrieve":
            qs = qs.prefetch_related("insurances", "specialties")
        return qs.distinct() if self.action == "list" else qs

    def get_serializer_class(self):
        return CenterDetailSerializer if self.action == "retrieve" else CenterCardSerializer

    @action(detail=True)
    def availability(self, request, slug=None):
        return Response(availability_response(center=self.get_object()))

    @action(detail=True)
    def slots(self, request, slug=None):
        return Response(slots_response(request, center=self.get_object()))

    @action(detail=False)
    def stats(self, request):
        from django.db.models import Count

        rows = self.get_queryset().values("type").annotate(n=Count("id"))
        labels = dict(CenterType.choices)
        return Response([{"type": r["type"], "label": labels[r["type"]], "count": r["n"]} for r in rows])
