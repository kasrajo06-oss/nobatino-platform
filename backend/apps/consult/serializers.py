from rest_framework import serializers

from apps.scheduling.serializers import AppointmentSerializer

from .models import CallSignal, Consultation, ConsultMessage, ConsultService


class ConsultServiceSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = ConsultService
        fields = ["id", "kind", "kind_display", "price", "duration_minutes", "instant_enabled", "is_active"]


class ConsultMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConsultMessage
        fields = ["id", "from_doctor", "is_system", "text", "file", "created_at"]


class ConsultationSerializer(serializers.ModelSerializer):
    appointment = AppointmentSerializer(read_only=True)
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)
    state_display = serializers.CharField(source="get_state_display", read_only=True)
    doctor = serializers.SerializerMethodField()
    role = serializers.SerializerMethodField()
    unread_hint = serializers.SerializerMethodField()

    class Meta:
        model = Consultation
        fields = [
            "id", "kind", "kind_display", "is_instant", "complaint", "state", "state_display", "doctor_deadline",
            "started_at", "closes_at", "closed_at", "doctor_summary", "appointment", "doctor", "role", "unread_hint",
            "created_at",
        ]

    def get_doctor(self, obj):
        d = obj.appointment.doctor
        return {"short_id": d.short_id, "slug": d.slug, "full_name": d.full_name, "photo": d.photo.url if d.photo else None,
                "specialty": d.primary_specialty.title, "gender": d.gender}

    def get_role(self, obj):
        request = self.context.get("request")
        return "doctor" if request and obj.is_doctor(request.user) else "patient"

    def get_unread_hint(self, obj):
        last = obj.messages.exclude(is_system=True).order_by("-id").first()
        return {"from_doctor": last.from_doctor, "text": last.text[:80], "at": last.created_at} if last else None


class StartConsultSerializer(serializers.Serializer):
    doctor = serializers.CharField(help_text="short_id")
    kind = serializers.ChoiceField(choices=["phone", "text", "video"])
    complaint = serializers.CharField(max_length=4000)
    slot = serializers.IntegerField(required=False, allow_null=True)
    instant = serializers.BooleanField(default=False)
    family_member = serializers.IntegerField(required=False, allow_null=True)


class CallSignalSerializer(serializers.ModelSerializer):
    mine = serializers.SerializerMethodField()

    class Meta:
        model = CallSignal
        fields = ["id", "kind", "payload", "mine", "created_at"]

    def get_mine(self, obj):
        request = self.context.get("request")
        return bool(request and obj.sender_id == request.user.id)
