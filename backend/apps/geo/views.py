from django_filters import rest_framework as filters
from rest_framework import viewsets

from .models import City, Province
from .serializers import CitySerializer, ProvinceSerializer


class ProvinceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Province.objects.all()
    serializer_class = ProvinceSerializer
    pagination_class = None
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"


class CityFilter(filters.FilterSet):
    province = filters.CharFilter(field_name="province__slug")
    q = filters.CharFilter(field_name="name", lookup_expr="icontains")

    class Meta:
        model = City
        fields = ["province", "is_popular", "q"]


class CityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = City.objects.select_related("province")
    serializer_class = CitySerializer
    filterset_class = CityFilter
    pagination_class = None
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
