from django.utils import timezone
from rest_framework import serializers

from apps.lab.models import LabReception

from .models import Appointment, ScheduleException, WeeklySchedule


class LabReceptionSerializer(serializers.ModelSerializer):
    tests = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = LabReception
        fields = [
            "tests", "prescription", "has_insurance_prescription", "home_sampling", "home_address",
            "estimated_price", "status", "status_display", "result_file",
        ]

    def get_tests(self, obj):
        return [{"id": t.id, "name": t.name} for t in obj.tests.all()]


class AppointmentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    provider_name = serializers.CharField(read_only=True)
    provider_url = serializers.SerializerMethodField()
    specialty = serializers.SerializerMethodField()
    address = serializers.SerializerMethodField()
    phone = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    can_review = serializers.SerializerMethodField()
    lab_reception = LabReceptionSerializer(read_only=True)

    class Meta:
        model = Appointment
        fields = [
            "id", "tracking_code", "kind", "kind_display", "status", "status_display", "start", "provider_name",
            "provider_url", "specialty", "address", "phone", "patient_name", "patient_national_code",
            "patient_mobile", "price", "paid_amount", "refunded_amount", "held_until", "patient_note",
            "cancel_reason", "can_cancel", "can_review", "lab_reception", "created_at",
        ]

    def get_provider_url(self, obj):
        if obj.doctor_id:
            return f"/doctor/{obj.doctor.slug}/{obj.doctor.short_id}"
        return f"/center/{obj.center.slug}" if obj.center_id else None

    def get_specialty(self, obj):
        return obj.doctor.primary_specialty.title if obj.doctor_id else obj.center.get_type_display()

    def get_address(self, obj):
        return obj.office.address if obj.office_id else obj.center.address

    def get_phone(self, obj):
        return obj.office.phone if obj.office_id else obj.center.phone

    def get_can_cancel(self, obj):
        return obj.status in ("pending_payment", "confirmed") and obj.start > timezone.now()

    def get_can_review(self, obj):
        return obj.status == "attended" and not hasattr(obj, "review")


class BookSerializer(serializers.Serializer):
    slot = serializers.IntegerField()
    family_member = serializers.IntegerField(required=False, allow_null=True)
    note = serializers.CharField(required=False, allow_blank=True, max_length=400)
    # lab-only fields
    tests = serializers.ListField(child=serializers.IntegerField(), required=False)
    prescription = serializers.FileField(required=False)
    has_insurance_prescription = serializers.BooleanField(required=False, default=False)
    home_sampling = serializers.BooleanField(required=False, default=False)
    home_address = serializers.CharField(required=False, allow_blank=True, max_length=400)


class CancelSerializer(serializers.Serializer):
    reason = serializers.CharField(required=False, allow_blank=True, max_length=255)


class WeeklyScheduleSerializer(serializers.ModelSerializer):
    weekday_display = serializers.CharField(source="get_weekday_display", read_only=True)

    class Meta:
        model = WeeklySchedule
        fields = ["id", "office", "weekday", "weekday_display", "start_time", "end_time", "slot_minutes", "capacity", "is_active"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        start = attrs.get("start_time", getattr(self.instance, "start_time", None))
        end = attrs.get("end_time", getattr(self.instance, "end_time", None))
        if start and end and end <= start:
            raise serializers.ValidationError("ساعت پایان باید بعد از ساعت شروع باشد.")
        minutes = attrs.get("slot_minutes", getattr(self.instance, "slot_minutes", 15))
        if not 5 <= minutes <= 240:
            raise serializers.ValidationError("مدت نوبت باید بین ۵ تا ۲۴۰ دقیقه باشد.")
        return attrs


class ScheduleExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = ScheduleException
        fields = ["id", "office", "date", "start_time", "end_time", "reason"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        s, e = attrs.get("start_time"), attrs.get("end_time")
        if (s is None) != (e is None):
            raise serializers.ValidationError("هر دو ساعت شروع و پایان را وارد کنید یا هر دو را خالی بگذارید.")
        if s and e and e <= s:
            raise serializers.ValidationError("ساعت پایان باید بعد از ساعت شروع باشد.")
        return attrs
