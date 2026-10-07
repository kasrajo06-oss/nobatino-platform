from django.contrib import admin

from .models import SmsLog


@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ["mobile", "kind", "status", "created_at"]
    list_filter = ["kind", "status"]
    search_fields = ["mobile"]
