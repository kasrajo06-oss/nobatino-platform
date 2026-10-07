from rest_framework import serializers

from .models import City, Province


class ProvinceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Province
        fields = ["id", "name", "slug"]


class CitySerializer(serializers.ModelSerializer):
    province_name = serializers.CharField(source="province.name", read_only=True)

    class Meta:
        model = City
        fields = ["id", "name", "slug", "province", "province_name", "lat", "lng", "is_popular"]
