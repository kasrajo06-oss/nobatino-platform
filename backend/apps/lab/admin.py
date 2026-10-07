from django.contrib import admin

from .models import CenterLabTest, LabReception, LabTest


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ["name", "en_name", "category", "fasting_hours"]
    search_fields = ["name", "en_name"]
    list_filter = ["category"]


admin.site.register(CenterLabTest)
admin.site.register(LabReception)
