from celery import shared_task

from .services import expire_overdue


@shared_task
def expire_consultations():
    return expire_overdue()
