from django.contrib import admin

from .models import Article, Category


@admin.register(Article)
class ArticleAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "status", "published_at", "views", "is_featured"]
    list_filter = ["status", "category", "is_featured"]
    search_fields = ["title", "excerpt"]
    filter_horizontal = ["specialties", "conditions"]
    raw_id_fields = ["author", "reviewed_by"]
    prepopulated_fields = {"slug": ("title",)}


admin.site.register(Category)
