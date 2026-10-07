from rest_framework import serializers

from .models import Review


class PublicReviewSerializer(serializers.ModelSerializer):
    author = serializers.CharField(source="author_display")
    wait_display = serializers.CharField(source="get_wait_minutes_display", default=None)

    class Meta:
        model = Review
        fields = ["id", "author", "rating", "recommends", "wait_minutes", "wait_display", "text", "reply", "created_at"]


class ReviewCreateSerializer(serializers.ModelSerializer):
    appointment = serializers.IntegerField(write_only=True)

    class Meta:
        model = Review
        fields = ["appointment", "rating", "recommends", "wait_minutes", "text", "show_name"]


class ReviewSerializer(serializers.ModelSerializer):
    doctor_name = serializers.CharField(source="doctor.full_name", default=None)
    center_name = serializers.CharField(source="center.name", default=None)
    tracking_code = serializers.CharField(source="appointment.tracking_code")
    author = serializers.CharField(source="author_display")

    class Meta:
        model = Review
        fields = [
            "id", "tracking_code", "doctor_name", "center_name", "author", "rating", "recommends", "wait_minutes",
            "text", "show_name", "status", "reply", "replied_at", "created_at",
        ]
