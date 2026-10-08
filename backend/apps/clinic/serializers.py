from rest_framework import serializers

from apps.geo.serializers import CitySerializer

from .models import PackageOrder, ServicePackage


class PackageCardSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    provider_name = serializers.CharField(read_only=True)
    city = CitySerializer(read_only=True)
    remaining = serializers.IntegerField(read_only=True)
    provider = serializers.SerializerMethodField()

    class Meta:
        model = ServicePackage
        fields = [
            "id", "title", "slug", "category", "category_display", "summary", "cover", "original_price", "price",
            "discount_percent", "provider_name", "provider", "city", "sold_count", "remaining", "valid_days",
        ]

    def get_provider(self, obj):
        if obj.doctor_id:
            d = obj.doctor
            return {"type": "doctor", "url": f"/doctor/{d.slug}/{d.short_id}", "gender": d.gender, "photo": d.photo.url if d.photo else None, "subtitle": d.primary_specialty.title}
        c = obj.center
        return {"type": "center", "url": f"/center/{c.slug}", "center_type": c.type, "photo": c.logo.url if c.logo else None, "subtitle": c.get_type_display()}


class PackageDetailSerializer(PackageCardSerializer):
    includes = serializers.SerializerMethodField()

    class Meta(PackageCardSerializer.Meta):
        fields = PackageCardSerializer.Meta.fields + ["description", "includes", "terms", "address", "max_per_user"]

    def get_includes(self, obj):
        return [line.strip("-• ").strip() for line in obj.includes.splitlines() if line.strip()]


class PackageWriteSerializer(serializers.ModelSerializer):
    """Providers (doctor/center panels) and operators create/edit packages."""

    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ServicePackage
        fields = [
            "id", "title", "slug", "category", "city", "address", "cover", "summary", "description", "includes", "terms",
            "original_price", "price", "valid_days", "capacity", "max_per_user", "is_active", "status", "status_display",
            "rejection_reason", "sold_count",
        ]
        read_only_fields = ["id", "slug", "status", "rejection_reason", "sold_count"]

    def validate(self, attrs):
        op = attrs.get("original_price", getattr(self.instance, "original_price", 0))
        pr = attrs.get("price", getattr(self.instance, "price", 0))
        if pr > op:
            raise serializers.ValidationError({"price": "قیمت با تخفیف نباید از قیمت اصلی بیشتر باشد."})
        return attrs


class PackageOrderSerializer(serializers.ModelSerializer):
    package = PackageCardSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = PackageOrder
        fields = [
            "id", "package", "status", "status_display", "voucher_code", "price", "paid_amount", "refunded_amount",
            "held_until", "paid_at", "expires_at", "used_at", "buyer_name", "buyer_mobile", "created_at",
        ]

    def to_representation(self, obj):
        data = super().to_representation(obj)
        # the voucher code is only revealed once paid
        if obj.status == PackageOrder.Status.PENDING_PAYMENT:
            data["voucher_code"] = None
        return data
