"""Shared read-only availability responses for doctor offices and centers."""
from datetime import date, timedelta

import jdatetime
from django.db.models import Count, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from .models import AppointmentKind, Slot
from .services import available_slots

WEEKDAY_FA = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"]


def _day_label(d: date):
    j = jdatetime.date.fromgregorian(date=d)
    return {
        "date": d.isoformat(),
        "jalali": j.strftime("%Y/%m/%d"),
        "weekday": WEEKDAY_FA[(d.weekday() + 2) % 7],
        "day": j.day,
        "month": j.j_months_fa[j.month - 1],
    }


def availability_response(office=None, center=None, days=14):
    owner = {"office": office, "center": None} if office else {"office": None, "center": center}
    today = timezone.localdate()
    counts = dict(
        Slot.objects.filter(
            start__gt=timezone.now(),
            start__date__lt=today + timedelta(days=days),
            is_blocked=False,
            booked_count__lt=F("capacity"),
            **owner,
        )
        .annotate(d=TruncDate("start", tzinfo=timezone.get_current_timezone()))
        .values("d")
        .annotate(n=Count("id"))
        .values_list("d", "n")
    )
    result = []
    for i in range(days):
        d = today + timedelta(days=i)
        result.append({**_day_label(d), "free": counts.get(d, 0)})
    return {"office": office.id if office else None, "center": center.id if center else None, "days": result}


def slots_response(request, office=None, center=None):
    raw = request.query_params.get("date")
    try:
        day = date.fromisoformat(raw) if raw else timezone.localdate()
    except ValueError as e:
        raise ValidationError({"date": "فرمت تاریخ نامعتبر است (YYYY-MM-DD)."}) from e
    kind = AppointmentKind.LAB if center else AppointmentKind.IN_PERSON
    slots = available_slots(office=office, center=center, date=day, kind=kind)
    return {
        **_day_label(day),
        "slots": [
            {"id": s.id, "start": s.start, "time": timezone.localtime(s.start).strftime("%H:%M"), "remaining": s.capacity - s.booked_count}
            for s in slots
        ],
    }
