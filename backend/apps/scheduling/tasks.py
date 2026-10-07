from celery import shared_task

from apps.centers.models import Center
from apps.doctors.models import Office

from . import services


@shared_task
def generate_slots_task():
    total = 0
    for office in Office.objects.filter(is_active=True).select_related("doctor"):
        total += services.generate_slots(office=office)
    for center in Center.objects.filter(is_active=True, online_reception=True):
        total += services.generate_slots(center=center)
    return total


@shared_task
def generate_slots_for(office_id=None, center_id=None):
    if office_id:
        return services.generate_slots(office=Office.objects.get(pk=office_id))
    return services.generate_slots(center=Center.objects.get(pk=center_id))


@shared_task
def release_expired_holds():
    return services.expire_holds()
