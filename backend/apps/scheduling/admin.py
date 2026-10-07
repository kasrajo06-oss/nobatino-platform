from django.contrib import admin

from .models import Appointment, ScheduleException, Slot, WeeklySchedule


@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ["tracking_code", "patient_name", "kind", "status", "start", "price", "paid_amount"]
    list_filter = ["status", "kind"]
    search_fields = ["tracking_code", "patient_name", "patient_national_code", "patient_mobile"]
    raw_id_fields = ["slot", "doctor", "office", "center", "user", "family_member", "cancelled_by"]
    date_hierarchy = "start"


@admin.register(WeeklySchedule)
class WeeklyScheduleAdmin(admin.ModelAdmin):
    list_display = ["office", "center", "weekday", "start_time", "end_time", "slot_minutes", "capacity"]
    raw_id_fields = ["office", "center"]


admin.site.register(ScheduleException)
admin.site.register(Slot)
