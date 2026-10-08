from django.contrib import admin

from .models import Consultation, ConsultMessage, ConsultService


@admin.register(ConsultService)
class ConsultServiceAdmin(admin.ModelAdmin):
    list_display = ["doctor", "kind", "price", "instant_enabled", "is_active"]
    list_filter = ["kind", "is_active"]
    raw_id_fields = ["doctor"]


class MessageInline(admin.TabularInline):
    model = ConsultMessage
    extra = 0
    raw_id_fields = ["sender"]


@admin.register(Consultation)
class ConsultationAdmin(admin.ModelAdmin):
    list_display = ["appointment", "kind", "is_instant", "state", "doctor_deadline", "created_at"]
    list_filter = ["kind", "state", "is_instant"]
    raw_id_fields = ["appointment"]
    inlines = [MessageInline]
