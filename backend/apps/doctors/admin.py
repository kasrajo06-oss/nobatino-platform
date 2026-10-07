from django.contrib import admin

from .models import DoctorDocument, DoctorProfile, Endorsement, Office


class OfficeInline(admin.StackedInline):
    model = Office
    extra = 0
    filter_horizontal = ["insurances"]


class DocumentInline(admin.TabularInline):
    model = DoctorDocument
    extra = 0


@admin.register(DoctorProfile)
class DoctorAdmin(admin.ModelAdmin):
    list_display = ["full_name", "medical_council_no", "primary_specialty", "verification_status", "is_active", "rating_avg"]
    list_filter = ["verification_status", "is_active", "gender", "primary_specialty"]
    search_fields = ["first_name", "last_name", "medical_council_no", "user__mobile"]
    filter_horizontal = ["specialties"]
    raw_id_fields = ["user"]
    inlines = [OfficeInline, DocumentInline]


admin.site.register(Endorsement)
