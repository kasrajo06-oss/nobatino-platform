from celery import shared_task

from .services import expire_orders


@shared_task
def expire_package_orders():
    return expire_orders()
