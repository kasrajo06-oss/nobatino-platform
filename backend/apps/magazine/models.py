import math
import re

from django.conf import settings
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel
from apps.core.utils import normalize_fa


class Category(models.Model):
    name = models.CharField("نام", max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, allow_unicode=True)
    description = models.CharField("توضیح", max_length=300, blank=True)
    order = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "دسته مجله"
        verbose_name_plural = "دسته‌های مجله"

    def __str__(self):
        return self.name


class Article(TimeStampedModel):
    class Status(models.TextChoices):
        DRAFT = "draft", "پیش‌نویس"
        PUBLISHED = "published", "منتشر شده"

    title = models.CharField("عنوان", max_length=200)
    slug = models.SlugField("اسلاگ", max_length=220, unique=True, allow_unicode=True)
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="articles", verbose_name="دسته")
    excerpt = models.CharField("خلاصه", max_length=400)
    body = models.TextField("متن (Markdown)")
    cover = models.ImageField("تصویر شاخص", upload_to="magazine/", blank=True)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name="articles")
    author_name = models.CharField("نام نویسنده", max_length=120, blank=True)
    reviewed_by = models.ForeignKey(
        "doctors.DoctorProfile", on_delete=models.SET_NULL, null=True, blank=True, related_name="reviewed_articles",
        verbose_name="بازبینی علمی توسط",
    )
    specialties = models.ManyToManyField("catalog.Specialty", blank=True, related_name="articles", verbose_name="تخصص‌های مرتبط")
    conditions = models.ManyToManyField("catalog.Condition", blank=True, related_name="articles", verbose_name="بیماری‌های مرتبط")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.DRAFT, db_index=True)
    published_at = models.DateTimeField("تاریخ انتشار", null=True, blank=True, db_index=True)
    is_featured = models.BooleanField("ویژه", default=False)
    views = models.PositiveIntegerField(default=0)
    seo_title = models.CharField(max_length=200, blank=True)
    seo_description = models.CharField(max_length=300, blank=True)
    search_text = models.TextField(blank=True, editable=False)

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name = "مقاله"
        verbose_name_plural = "مقالات"

    def __str__(self):
        return self.title

    @property
    def reading_minutes(self):
        words = len(re.findall(r"\w+", self.body))
        return max(1, math.ceil(words / 200))

    def save(self, *args, **kwargs):
        if self.status == self.Status.PUBLISHED and not self.published_at:
            self.published_at = timezone.now()
        self.search_text = normalize_fa(f"{self.title} {self.excerpt}")
        super().save(*args, **kwargs)
