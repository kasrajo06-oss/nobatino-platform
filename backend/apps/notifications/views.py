from rest_framework import mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .inbox import active_call, mark_read
from .models import Notification
from .serializers import MarkReadSerializer, NotificationSerializer


class NotificationViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        qs = Notification.objects.filter(user=self.request.user)
        if self.request.query_params.get("unread") in ("1", "true"):
            qs = qs.filter(is_read=False)
        return qs

    @action(detail=False)
    def summary(self, request):
        """Cheap endpoint polled by the header every few seconds."""
        qs = Notification.objects.filter(user=request.user)
        call = active_call(request.user)
        return Response({
            "unread": qs.filter(is_read=False).count(),
            "latest": NotificationSerializer(qs[:8], many=True).data,
            "call": NotificationSerializer(call).data if call else None,
        })

    @action(detail=False, methods=["post"])
    def read(self, request):
        s = MarkReadSerializer(data=request.data)
        s.is_valid(raise_exception=True)
        d = s.validated_data
        n = mark_read(request.user, ids=d.get("ids"), link=d.get("link"), all_=d.get("all", False))
        return Response({"marked": n})
