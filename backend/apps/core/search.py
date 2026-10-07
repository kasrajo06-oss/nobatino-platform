from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.catalog.models import Condition, Specialty
from apps.centers.models import Center
from apps.core.utils import normalize_fa
from apps.doctors.views import public_doctors


class SuggestView(APIView):
    """Autocomplete for the header search box: doctors, specialties, conditions and centers."""

    def get(self, request):
        q = normalize_fa(request.query_params.get("q", ""))
        city = request.query_params.get("city")
        if len(q) < 2:
            return Response({"doctors": [], "specialties": [], "conditions": [], "centers": []})
        words = q.split()

        doctors = public_doctors()
        centers = Center.objects.filter(is_active=True, verification_status="approved")
        for w in words:
            doctors = doctors.filter(search_text__contains=w)
            centers = centers.filter(search_text__contains=w)
        if city:
            doctors = doctors.filter(offices__city__slug=city)
            centers = centers.filter(city__slug=city)
        doctors = doctors.distinct().order_by("-popularity")[:6]
        centers = centers.select_related("city")[:4]

        specialties = Specialty.objects.filter(Q(name__icontains=words[0]) | Q(title__icontains=words[0]))[:5]
        conditions = Condition.objects.filter(Q(name__icontains=words[0]) | Q(synonyms__icontains=words[0]))[:5]
        return Response(
            {
                "doctors": [
                    {"short_id": d.short_id, "slug": d.slug, "full_name": d.full_name,
                     "specialty": d.primary_specialty.title, "photo": d.photo.url if d.photo else None}
                    for d in doctors
                ],
                "specialties": [{"slug": s.slug, "name": s.name} for s in specialties],
                "conditions": [{"slug": c.slug, "name": c.name} for c in conditions],
                "centers": [{"slug": c.slug, "name": c.name, "type": c.get_type_display(), "city": c.city.name} for c in centers],
            }
        )


class StatsView(APIView):
    """Public numbers for the home page."""

    def get(self, request):
        from apps.geo.models import City
        from apps.scheduling.models import Appointment

        return Response(
            {
                "doctors": public_doctors().count(),
                "centers": Center.objects.filter(is_active=True, verification_status="approved").count(),
                "appointments": Appointment.objects.filter(status__in=["confirmed", "attended"]).count(),
                "cities": City.objects.filter(offices__isnull=False).distinct().count(),
            }
        )
