from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "body", "link", "count", "is_read", "created_at"]


class MarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(child=serializers.IntegerField(), required=False)
    link = serializers.CharField(required=False, allow_blank=True)
    all = serializers.BooleanField(required=False, default=False)
