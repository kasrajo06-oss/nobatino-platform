from rest_framework import serializers

from apps.catalog.serializers import InsuranceSerializer, SpecialtyMiniSerializer
from apps.doctors.models import Office
from apps.geo.serializers import CitySerializer
from apps.lab.models import CenterLabTest

from .models import Center


class CenterCardSerializer(serializers.ModelSerializer):
    type_display = serializers.CharField(source="get_type_display", read_only=True)
    city = CitySerializer(read_only=True)

    class Meta:
        model = Center
        fields = [
            "id", "slug", "type", "type_display", "name", "city", "address", "phone", "logo", "is_24h",
            "is_public_sector", "has_home_sampling", "online_reception", "rating_avg", "review_count",
            "first_free_slot_at",
        ]


class CenterLabTestSerializer(serializers.ModelSerializer):
    test_id = serializers.IntegerField(source="test.id")
    name = serializers.CharField(source="test.name")
    en_name = serializers.CharField(source="test.en_name")
    category = serializers.CharField(source="test.category")
    fasting_hours = serializers.IntegerField(source="test.fasting_hours")
    preparation = serializers.CharField(source="test.preparation")

    class Meta:
        model = CenterLabTest
        fields = ["id", "test_id", "name", "en_name", "category", "fasting_hours", "preparation", "price"]


class CenterDoctorSerializer(serializers.ModelSerializer):
    short_id = serializers.CharField(source="doctor.short_id")
    slug = serializers.CharField(source="doctor.slug")
    full_name = serializers.CharField(source="doctor.full_name")
    photo = serializers.ImageField(source="doctor.photo")
    specialty = serializers.CharField(source="doctor.primary_specialty.title")
    rating_avg = serializers.DecimalField(source="doctor.rating_avg", max_digits=3, decimal_places=2)
    gender = serializers.CharField(source="doctor.gender")

    class Meta:
        model = Office
        fields = ["short_id", "slug", "full_name", "photo", "specialty", "rating_avg", "gender"]


class CenterDetailSerializer(CenterCardSerializer):
    insurances = InsuranceSerializer(many=True, read_only=True)
    specialties = SpecialtyMiniSerializer(many=True, read_only=True)
    lab_tests = serializers.SerializerMethodField()
    doctors = serializers.SerializerMethodField()

    class Meta(CenterCardSerializer.Meta):
        fields = CenterCardSerializer.Meta.fields + [
            "lat", "lng", "website", "description", "cover", "working_hours", "insurances", "specialties",
            "reception_fee", "home_sampling_fee", "lab_tests", "doctors",
        ]

    def get_lab_tests(self, obj):
        qs = obj.lab_tests.filter(is_active=True).select_related("test")
        return CenterLabTestSerializer(qs, many=True).data

    def get_doctors(self, obj):
        qs = (
            Office.objects.filter(center=obj, is_active=True, doctor__is_active=True, doctor__verification_status="approved")
            .select_related("doctor__primary_specialty")[:30]
        )
        return CenterDoctorSerializer(qs, many=True, context=self.context).data
