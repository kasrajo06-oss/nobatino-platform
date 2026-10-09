from django.contrib import admin

from .models import Notification, SmsLog


@admin.register(SmsLog)
class SmsLogAdmin(admin.ModelAdmin):
    list_display = ["mobile", "kind", "status", "created_at"]
    list_filter = ["kind", "status"]
    search_fields = ["mobile"]


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["user", "kind", "title", "is_read", "created_at"]
    list_filter = ["kind", "is_read"]
    search_fields = ["user__mobile", "title"]
    raw_id_fields = ["user"]
