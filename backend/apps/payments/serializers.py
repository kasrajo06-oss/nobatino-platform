from rest_framework import serializers

from .models import Payment, Settlement, WalletTransaction


class WalletTransactionSerializer(serializers.ModelSerializer):
    kind_display = serializers.CharField(source="get_kind_display", read_only=True)

    class Meta:
        model = WalletTransaction
        fields = ["id", "amount", "balance_after", "kind", "kind_display", "description", "created_at"]


class PaymentSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    purpose_display = serializers.CharField(source="get_purpose_display", read_only=True)
    tracking_code = serializers.CharField(source="appointment.tracking_code", default=None)

    class Meta:
        model = Payment
        fields = [
            "id", "purpose", "purpose_display", "amount", "wallet_amount", "status", "status_display", "ref_id",
            "tracking_code", "paid_at", "error", "created_at",
        ]


class StartPaymentSerializer(serializers.Serializer):
    tracking_code = serializers.CharField()
    use_wallet = serializers.BooleanField(default=True)


class TopupSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=10_000, max_value=50_000_000)


class SettlementSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payee = serializers.SerializerMethodField()

    class Meta:
        model = Settlement
        fields = ["id", "payee", "amount", "iban", "status", "status_display", "bank_ref", "note", "processed_at", "created_at"]
        read_only_fields = ["id", "status", "bank_ref", "note", "processed_at", "created_at"]

    def get_payee(self, obj):
        return obj.doctor.full_name if obj.doctor_id else (obj.center.name if obj.center_id else "")

    def validate_iban(self, value):
        from apps.core.utils import to_en_digits

        value = to_en_digits(value).upper().replace(" ", "")
        if not value.startswith("IR"):
            value = "IR" + value
        if len(value) != 26 or not value[2:].isdigit():
            raise serializers.ValidationError("شماره شبا باید ۲۴ رقم باشد.")
        return value
