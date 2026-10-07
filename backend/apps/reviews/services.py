import math

from django.db.models import Avg, Count, Q

from apps.doctors.models import DoctorProfile

from .models import Review


def refresh_doctor_stats(doctor: DoctorProfile):
    approved = Review.objects.filter(doctor=doctor, status=Review.Status.APPROVED)
    agg = approved.aggregate(
        avg=Avg("rating"),
        cnt=Count("id"),
        rec=Count("id", filter=Q(recommends=True)),
        wait=Avg("wait_minutes"),
    )
    cnt = agg["cnt"] or 0
    rating = round(agg["avg"] or 0, 2)
    recommend_pct = round(100 * agg["rec"] / cnt) if cnt else 0
    endorsements = doctor.endorsements_received.count()
    # Bayesian-ish popularity: rating weighted by volume + successful visits + endorsements
    popularity = (rating * math.log1p(cnt)) + math.log1p(doctor.successful_appointments) + 0.5 * math.log1p(endorsements)
    DoctorProfile.objects.filter(pk=doctor.pk).update(
        rating_avg=rating,
        review_count=cnt,
        recommend_pct=recommend_pct,
        avg_wait_minutes=round(agg["wait"]) if agg["wait"] else None,
        endorsement_count=endorsements,
        popularity=popularity,
    )


def refresh_center_stats(center):
    agg = Review.objects.filter(center=center, status=Review.Status.APPROVED).aggregate(avg=Avg("rating"), cnt=Count("id"))
    type(center).objects.filter(pk=center.pk).update(rating_avg=round(agg["avg"] or 0, 2), review_count=agg["cnt"] or 0)
