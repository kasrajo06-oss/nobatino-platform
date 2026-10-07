from .models import AuditLog


def _ip(request):
    if request is None:
        return None
    fwd = request.META.get("HTTP_X_FORWARDED_FOR")
    return (fwd.split(",")[0].strip() if fwd else request.META.get("REMOTE_ADDR")) or None


def audit(request, action, target=None, actor=None, **data):
    actor = actor or (request.user if request is not None and request.user.is_authenticated else None)
    AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target._meta.label if target is not None else "",
        target_id=str(target.pk) if target is not None else "",
        target_repr=str(target)[:200] if target is not None else "",
        data=data,
        ip=_ip(request),
    )
