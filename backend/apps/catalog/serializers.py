from rest_framework import serializers

from .models import Condition, Degree, Insurance, Specialty


class SpecialtyMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Specialty
        fields = ["id", "name", "title", "slug"]


class SpecialtySerializer(serializers.ModelSerializer):
    children = SpecialtyMiniSerializer(many=True, read_only=True)

    class Meta:
        model = Specialty
        fields = ["id", "name", "title", "slug", "icon", "parent", "is_popular", "description", "children"]


class DegreeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Degree
        fields = ["id", "name", "slug"]


class ConditionSerializer(serializers.ModelSerializer):
    specialties = SpecialtyMiniSerializer(many=True, read_only=True)

    class Meta:
        model = Condition
        fields = ["id", "name", "slug", "is_popular", "description", "specialties"]


class InsuranceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Insurance
        fields = ["id", "name", "slug", "kind", "logo"]
