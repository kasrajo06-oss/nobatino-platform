from rest_framework import serializers, viewsets

from .models import LabTest


class LabTestSerializer(serializers.ModelSerializer):
    class Meta:
        model = LabTest
        fields = ["id", "name", "en_name", "slug", "category", "preparation", "fasting_hours", "result_days"]


class LabTestViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer
    pagination_class = None
    filterset_fields = ["category"]
    lookup_field = "slug"
    lookup_value_regex = "[^/]+"
