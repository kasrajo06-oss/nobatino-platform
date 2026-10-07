from django.db.models import F, Q
from django_filters import rest_framework as filters

from apps.catalog.models import Condition, Specialty
from apps.core.utils import normalize_fa

from .models import DoctorProfile


class DoctorFilter(filters.FilterSet):
    q = filters.CharFilter(method="filter_q")
    city = filters.CharFilter(method="filter_city")
    province = filters.CharFilter(field_name="offices__city__province__slug")
    specialty = filters.CharFilter(method="filter_specialty")
    condition = filters.CharFilter(method="filter_condition")
    insurance = filters.CharFilter(field_name="offices__insurances__slug")
    gender = filters.ChoiceFilter(choices=[("male", "male"), ("female", "female")])
    appointment_type = filters.CharFilter(method="filter_type")
    has_free_slot = filters.BooleanFilter(method="filter_free")
    instant = filters.BooleanFilter(field_name="offers_instant")
    ordering = filters.CharFilter(method="filter_ordering")

    class Meta:
        model = DoctorProfile
        fields: list[str] = []

    def filter_q(self, qs, name, value):
        for word in normalize_fa(value).split():
            qs = qs.filter(search_text__contains=word)
        return qs

    def filter_city(self, qs, name, value):
        return qs.filter(offices__city__slug=value, offices__is_active=True)

    def filter_specialty(self, qs, name, value):
        ids = list(Specialty.objects.filter(Q(slug=value) | Q(parent__slug=value)).values_list("id", flat=True))
        return qs.filter(specialties__in=ids)

    def filter_condition(self, qs, name, value):
        cond = Condition.objects.filter(slug=value).first()
        if not cond:
            return qs.none()
        return qs.filter(specialties__in=cond.specialties.all())

    def filter_type(self, qs, name, value):
        mapping = {
            "in_person": Q(offices__is_active=True, offices__booking_enabled=True),
            "phone": Q(offers_phone=True),
            "text": Q(offers_text=True),
            "video": Q(offers_video=True),
        }
        return qs.filter(mapping[value]) if value in mapping else qs

    def filter_free(self, qs, name, value):
        return qs.filter(first_free_slot_at__isnull=False) if value else qs

    def filter_ordering(self, qs, name, value):
        if value == "popular":
            return qs.order_by("-review_count", "-rating_avg")
        if value == "nearest_slot":
            return qs.order_by(F("first_free_slot_at").asc(nulls_last=True), "-popularity")
        if value == "most_successful":
            return qs.order_by("-successful_appointments")
        return qs.order_by("-popularity", "-review_count")
