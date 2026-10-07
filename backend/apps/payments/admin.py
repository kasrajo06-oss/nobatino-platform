from django.contrib import admin

from .models import Payment, Settlement, Wallet, WalletTransaction


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "purpose", "amount", "wallet_amount", "status", "ref_id", "created_at"]
    list_filter = ["status", "purpose", "gateway"]
    search_fields = ["authority", "ref_id", "user__mobile"]


@admin.register(Settlement)
class SettlementAdmin(admin.ModelAdmin):
    list_display = ["id", "doctor", "center", "amount", "status", "created_at"]
    list_filter = ["status"]


admin.site.register(Wallet)
admin.site.register(WalletTransaction)
