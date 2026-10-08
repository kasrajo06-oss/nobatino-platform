from datetime import timedelta

from django.db.models import Q
from django.utils import timezone
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


class HomeView(APIView):
    """Everything the home page and the header mega-menu need, in one cached call."""

    def get(self, request):
        from django.core.cache import cache

        data = cache.get("home-v1")
        if data is None:
            data = self.build()
            cache.set("home-v1", data, 60)
        return Response(data)

    def build(self):
        from django.db.models import Count, Q

        from apps.centers.models import CenterType
        from apps.geo.models import City
        from apps.reviews.models import Review

        public = Q(offices__doctor__is_active=True, offices__doctor__verification_status="approved", offices__is_active=True)
        cities = (
            City.objects.filter(is_popular=True)
            .annotate(doctor_count=Count("offices__doctor", filter=public, distinct=True))
            .order_by("order")
        )
        doctors = public_doctors()
        specialties = []
        for s in Specialty.objects.filter(parent__isnull=True).prefetch_related("children"):
            ids = [s.id] + [c.id for c in s.children.all()]
            specialties.append({
                "id": s.id, "name": s.name, "title": s.title, "slug": s.slug, "icon": s.icon, "is_popular": s.is_popular,
                "doctor_count": doctors.filter(specialties__in=ids).distinct().count(),
                "online_count": doctors.filter(specialties__in=ids).filter(Q(offers_phone=True) | Q(offers_text=True) | Q(offers_video=True)).distinct().count(),
            })
        center_counts = dict(
            Center.objects.filter(is_active=True, verification_status="approved").values_list("type").annotate(n=Count("id"))
        )
        reviews = (
            Review.objects.filter(status="approved", rating=5).exclude(text="").select_related("doctor", "user")
            .order_by("-created_at")[:6]
        )
        return {
            "cities": [{"id": c.id, "name": c.name, "slug": c.slug, "doctor_count": c.doctor_count} for c in cities],
            "specialties": specialties,
            "conditions": [
                {"slug": c.slug, "name": c.name, "is_popular": c.is_popular} for c in Condition.objects.all()
            ],
            "center_types": [{"type": k, "label": v, "count": center_counts.get(k, 0)} for k, v in CenterType.choices],
            "testimonials": [
                {"author": r.author_display, "text": r.text, "rating": r.rating,
                 "doctor": r.doctor.full_name if r.doctor_id else "", "doctor_url": f"/doctor/{r.doctor.slug}/{r.doctor.short_id}" if r.doctor_id else ""}
                for r in reviews
            ],
            "online_now": doctors.filter(
                offers_instant=True, is_online_now=True, online_seen_at__gt=timezone.now() - timedelta(minutes=5)
            ).count(),
        }
