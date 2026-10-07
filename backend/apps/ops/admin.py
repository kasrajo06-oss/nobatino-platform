from django.contrib import admin

from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "actor", "action", "target_repr", "ip"]
    list_filter = ["action"]
    search_fields = ["target_repr", "actor__mobile"]
