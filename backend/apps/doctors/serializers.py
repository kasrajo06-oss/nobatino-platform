from django.utils import timezone
from rest_framework import serializers

from apps.catalog.serializers import DegreeSerializer, InsuranceSerializer, SpecialtyMiniSerializer
from apps.geo.serializers import CitySerializer

from .models import DoctorProfile, Office

SHORT_WAIT_MINUTES = 15


def doctor_badges(doc):
    badges = []
    if doc.avg_wait_minutes is not None and doc.avg_wait_minutes <= SHORT_WAIT_MINUTES:
        badges.append({"key": "short_wait", "label": "کمترین معطلی"})
    if doc.review_count >= 20 and float(doc.rating_avg) >= 4.5:
        badges.append({"key": "top_rated", "label": "محبوب بیماران"})
    if doc.first_free_slot_at and timezone.localdate(doc.first_free_slot_at) == timezone.localdate():
        badges.append({"key": "today", "label": "نوبت امروز"})
    if doc.available_now:
        badges.append({"key": "online", "label": "آنلاین؛ پاسخ فوری"})
    return badges


def consult_types(doc, offices):
    types = []
    if any(o.is_active and o.booking_enabled for o in offices):
        types.append("in_person")
    types += [k for k, flag in (("phone", doc.offers_phone), ("text", doc.offers_text), ("video", doc.offers_video)) if flag]
    return types


def consult_services(doc):
    return [
        {"kind": s.kind, "kind_display": s.get_kind_display(), "price": s.price, "duration_minutes": s.duration_minutes,
         "instant_enabled": s.instant_enabled}
        for s in doc.consult_services.all() if s.is_active
    ]


class OfficeSerializer(serializers.ModelSerializer):
    city = CitySerializer(read_only=True)
    insurances = InsuranceSerializer(many=True, read_only=True)
    center_name = serializers.CharField(source="center.name", read_only=True, default=None)
    center_slug = serializers.CharField(source="center.slug", read_only=True, default=None)

    class Meta:
        model = Office
        fields = [
            "id", "title", "city", "address", "lat", "lng", "phone", "insurances", "visit_fee", "booking_fee",
            "booking_enabled", "notes", "center_name", "center_slug",
        ]


class DoctorCardSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    degree = serializers.CharField(source="degree.name")
    primary_specialty = SpecialtyMiniSerializer()
    specialties = SpecialtyMiniSerializer(many=True)
    badges = serializers.SerializerMethodField()
    consult_types = serializers.SerializerMethodField()
    main_office = serializers.SerializerMethodField()
    offices_count = serializers.SerializerMethodField()
    insurances = serializers.SerializerMethodField()
    consult_services = serializers.SerializerMethodField()
    available_now = serializers.BooleanField(read_only=True)

    class Meta:
        model = DoctorProfile
        fields = [
            "id", "short_id", "slug", "full_name", "first_name", "last_name", "gender", "photo", "degree",
            "primary_specialty", "specialties", "rating_avg", "review_count", "recommend_pct",
            "successful_appointments", "endorsement_count", "avg_wait_minutes", "first_free_slot_at",
            "badges", "consult_types", "main_office", "offices_count", "insurances", "offers_instant",
            "consult_services", "available_now", "first_online_slot_at",
        ]

    def _offices(self, obj):
        """Active offices; when the list is filtered by city, offices in that city come first."""
        offices = [o for o in obj.offices.all() if o.is_active]
        city = self.context.get("city")
        return sorted(offices, key=lambda o: o.city.slug != city) if city else offices

    def get_badges(self, obj):
        return doctor_badges(obj)

    def get_consult_services(self, obj):
        return consult_services(obj)

    def get_consult_types(self, obj):
        return consult_types(obj, self._offices(obj))

    def get_main_office(self, obj):
        offices = self._offices(obj)
        if not offices:
            return None
        o = offices[0]
        return {"id": o.id, "city": o.city.name, "city_slug": o.city.slug, "address": o.address, "visit_fee": o.visit_fee}

    def get_offices_count(self, obj):
        return len(self._offices(obj))

    def get_insurances(self, obj):
        seen = {}
        for o in self._offices(obj):
            for ins in o.insurances.all():
                seen[ins.id] = ins.name
        return list(seen.values())[:4]


class EndorserSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    specialty = serializers.CharField(source="primary_specialty.title")

    class Meta:
        model = DoctorProfile
        fields = ["short_id", "slug", "full_name", "photo", "specialty", "gender"]


class DoctorDetailSerializer(DoctorCardSerializer):
    degree = DegreeSerializer()
    offices = serializers.SerializerMethodField()
    endorsers = serializers.SerializerMethodField()
    experience_years = serializers.SerializerMethodField()

    class Meta(DoctorCardSerializer.Meta):
        fields = DoctorCardSerializer.Meta.fields + [
            "bio", "medical_council_no", "offices", "endorsers", "experience_years",
            "offers_phone", "offers_text", "offers_video",
        ]

    def get_offices(self, obj):
        return OfficeSerializer(self._offices(obj), many=True, context=self.context).data

    def get_endorsers(self, obj):
        qs = DoctorProfile.objects.filter(endorsements_given__to_doctor=obj).select_related("primary_specialty")[:12]
        return EndorserSerializer(qs, many=True, context=self.context).data

    def get_experience_years(self, obj):
        if not obj.experience_start_year:
            return None
        import jdatetime

        return max(0, jdatetime.date.today().year - obj.experience_start_year)
