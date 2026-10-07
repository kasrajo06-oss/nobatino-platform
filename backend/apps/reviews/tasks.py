from celery import shared_task

from apps.centers.models import Center
from apps.doctors.models import DoctorProfile

from .services import refresh_center_stats, refresh_doctor_stats


@shared_task
def refresh_all_stats():
    for doctor in DoctorProfile.objects.all().iterator():
        refresh_doctor_stats(doctor)
    for center in Center.objects.filter(review_count__gte=0).iterator():
        refresh_center_stats(center)


@shared_task
def refresh_stats_for(doctor_id=None, center_id=None):
    if doctor_id:
        refresh_doctor_stats(DoctorProfile.objects.get(pk=doctor_id))
    if center_id:
        refresh_center_stats(Center.objects.get(pk=center_id))
