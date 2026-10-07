from django.contrib import admin

from .models import City, Province


@admin.register(Province)
class ProvinceAdmin(admin.ModelAdmin):
    list_display = ["name", "slug"]
    search_fields = ["name"]


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ["name", "province", "is_popular", "order"]
    list_filter = ["province", "is_popular"]
    search_fields = ["name"]
