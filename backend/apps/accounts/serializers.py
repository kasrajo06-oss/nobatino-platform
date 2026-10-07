from rest_framework import serializers

from apps.core.utils import is_valid_national_code, normalize_mobile, to_en_digits

from .models import FamilyMember, User


class MobileField(serializers.CharField):
    def to_internal_value(self, data):
        from django.core.exceptions import ValidationError

        try:
            return normalize_mobile(str(data))
        except ValidationError as e:
            raise serializers.ValidationError(e.messages[0]) from e


class NationalCodeField(serializers.CharField):
    def to_internal_value(self, data):
        code = to_en_digits(str(data or "")).strip()
        if code and not is_valid_national_code(code):
            raise serializers.ValidationError("کد ملی معتبر نیست.")
        return code


class OtpRequestSerializer(serializers.Serializer):
    mobile = MobileField()


class OtpVerifySerializer(serializers.Serializer):
    mobile = MobileField()
    code = serializers.CharField(max_length=8)

    def validate_code(self, value):
        return to_en_digits(value).strip()


class UserSerializer(serializers.ModelSerializer):
    national_code = NationalCodeField(required=False, allow_blank=True)
    full_name = serializers.CharField(read_only=True)
    profile_completed = serializers.BooleanField(read_only=True)
    insurance_name = serializers.CharField(source="insurance.name", read_only=True, default=None)
    has_doctor_profile = serializers.SerializerMethodField()
    center_ids = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "mobile",
            "first_name",
            "last_name",
            "full_name",
            "national_code",
            "gender",
            "birth_date",
            "email",
            "insurance",
            "insurance_name",
            "role",
            "profile_completed",
            "has_doctor_profile",
            "center_ids",
            "date_joined",
        ]
        read_only_fields = ["id", "mobile", "role", "date_joined"]

    def get_has_doctor_profile(self, obj):
        return hasattr(obj, "doctor_profile")

    def get_center_ids(self, obj):
        return list(obj.center_memberships.values_list("center_id", flat=True))


class FamilyMemberSerializer(serializers.ModelSerializer):
    national_code = NationalCodeField()
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = FamilyMember
        fields = ["id", "first_name", "last_name", "full_name", "national_code", "gender", "birth_date", "relation"]

    def validate_national_code(self, value):
        owner = self.context["request"].user
        qs = FamilyMember.objects.filter(owner=owner, national_code=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("این کد ملی قبلاً ثبت شده است.")
        return value
