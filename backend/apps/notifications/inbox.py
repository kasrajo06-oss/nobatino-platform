"""In-app notifications (the bell in the header).

`notify()` is called from the business services right where something happens; the frontend polls
`/api/me/notifications/summary/` and shows a badge, a toast, a desktop notification and — for calls — a ringing popup.
"""
from datetime import timedelta

from django.utils import timezone

from .models import Notification

# chat messages in the same consultation are merged into one unread notification instead of piling up
COALESCE_KINDS = {Notification.Kind.CONSULT_MESSAGE}


def notify(user, kind, title, body="", link=""):
    if user is None:
        return None
    if kind in COALESCE_KINDS:
        existing = Notification.objects.filter(user=user, kind=kind, link=link, is_read=False).first()
        if existing:
            existing.title, existing.body, existing.count = title, body[:300], existing.count + 1
            existing.created_at = timezone.now()
            existing.save(update_fields=["title", "body", "count", "created_at"])
            return existing
    return Notification.objects.create(user=user, kind=kind, title=title[:150], body=body[:300], link=link)


def notify_many(users, kind, title, body="", link=""):
    return [notify(u, kind, title, body, link) for u in users]


def mark_read(user, *, ids=None, link=None, all_=False):
    qs = Notification.objects.filter(user=user, is_read=False)
    if ids:
        qs = qs.filter(id__in=ids)
    elif link:
        qs = qs.filter(link=link)
    elif not all_:
        return 0
    return qs.update(is_read=True, read_at=timezone.now())


def active_call(user):
    """An unanswered incoming call from the last minute (shown as a full-screen ringing popup)."""
    return (
        Notification.objects.filter(
            user=user, kind=Notification.Kind.CALL_INCOMING, is_read=False, created_at__gte=timezone.now() - timedelta(seconds=60)
        )
        .order_by("-created_at")
        .first()
    )
