from django.contrib import admin

from .models import Center, CenterStaff


class StaffInline(admin.TabularInline):
    model = CenterStaff
    extra = 0
    raw_id_fields = ["user"]


@admin.register(Center)
class CenterAdmin(admin.ModelAdmin):
    list_display = ["name", "type", "city", "verification_status", "is_active", "online_reception"]
    list_filter = ["type", "verification_status", "is_active", "online_reception"]
    search_fields = ["name", "address"]
    filter_horizontal = ["insurances", "specialties"]
    inlines = [StaffInline]
