from django.db.models import Case, F, Q, When
from django.utils import timezone
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
    online_now = filters.BooleanFilter(method="filter_online_now")
    telehealth = filters.BooleanFilter(method="filter_telehealth")
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

    def filter_online_now(self, qs, name, value):
        from datetime import timedelta

        from django.utils import timezone

        if not value:
            return qs
        return qs.filter(offers_instant=True, is_online_now=True, online_seen_at__gt=timezone.now() - timedelta(minutes=5))

    def filter_telehealth(self, qs, name, value):
        return qs.filter(Q(offers_phone=True) | Q(offers_text=True) | Q(offers_video=True)) if value else qs

    def filter_free(self, qs, name, value):
        # the cached value can lag behind the clock (refreshed on booking and hourly), so ignore past times
        return qs.filter(first_free_slot_at__gt=timezone.now()) if value else qs

    def filter_ordering(self, qs, name, value):
        if value == "popular":
            return qs.order_by("-review_count", "-rating_avg")
        if value == "nearest_slot":
            upcoming = Case(When(first_free_slot_at__gt=timezone.now(), then=F("first_free_slot_at")), default=None)
            return qs.order_by(upcoming.asc(nulls_last=True), "-popularity")
        if value == "nearest_online_slot":
            upcoming = Case(When(first_online_slot_at__gt=timezone.now(), then=F("first_online_slot_at")), default=None)
            return qs.order_by(upcoming.asc(nulls_last=True), "-popularity")
        if value == "online_now":
            return qs.order_by("-is_online_now", "-online_seen_at", "-popularity")
        if value == "most_successful":
            return qs.order_by("-successful_appointments")
        return qs.order_by("-popularity", "-review_count")
