from django.contrib import admin

from .models import Condition, Degree, Insurance, Specialty


@admin.register(Specialty)
class SpecialtyAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "is_popular", "order"]
    list_filter = ["is_popular", "parent"]
    search_fields = ["name", "title"]


@admin.register(Condition)
class ConditionAdmin(admin.ModelAdmin):
    list_display = ["name", "is_popular"]
    filter_horizontal = ["specialties"]
    search_fields = ["name", "synonyms"]


admin.site.register(Degree)
admin.site.register(Insurance)
