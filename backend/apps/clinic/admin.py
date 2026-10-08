from django.contrib import admin

from .models import PackageOrder, ServicePackage


@admin.register(ServicePackage)
class ServicePackageAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "price", "original_price", "status", "sold_count", "is_active"]
    list_filter = ["category", "status", "is_active"]
    search_fields = ["title"]
    raw_id_fields = ["doctor", "center"]


@admin.register(PackageOrder)
class PackageOrderAdmin(admin.ModelAdmin):
    list_display = ["voucher_code", "package", "buyer_name", "status", "paid_amount", "created_at"]
    list_filter = ["status"]
    search_fields = ["voucher_code", "buyer_mobile"]
    raw_id_fields = ["package", "user", "redeemed_by"]
