"""Run the Celery beat schedule in-process (for the single-container demo, which has no Redis/Celery).

    python manage.py run_periodic
"""
import time

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import close_old_connections
from django.utils.module_loading import import_string


class Command(BaseCommand):
    help = "Run CELERY_BEAT_SCHEDULE tasks in a loop without a broker."

    def handle(self, *args, **options):
        jobs = [(name, import_string(job["task"]), job["schedule"]) for name, job in settings.CELERY_BEAT_SCHEDULE.items()]
        next_run = {name: 0.0 for name, _, _ in jobs}  # everything runs once at start-up
        self.stdout.write(f"periodic runner: {len(jobs)} jobs")
        while True:
            for name, task, every in jobs:
                if time.monotonic() < next_run[name]:
                    continue
                close_old_connections()
                try:
                    result = task()
                    self.stdout.write(f"{name}: {result}")
                except Exception as e:  # keep the loop alive; the next run may succeed
                    self.stderr.write(f"{name} failed: {e!r}")
                next_run[name] = time.monotonic() + every
            time.sleep(5)
