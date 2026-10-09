# Demo only: run the periodic jobs as a thread of the single worker instead of a separate
# process (saves ~90 MB on 512 MB free plans).
import threading


def post_worker_init(worker):
    from django.core.management import call_command

    threading.Thread(target=call_command, args=("run_periodic",), daemon=True, name="periodic").start()
