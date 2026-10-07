from django.db import models

from apps.core.models import TimeStampedModel


class Page(TimeStampedModel):
    slug = models.SlugField(unique=True, allow_unicode=True)
    title = models.CharField(max_length=200)
    body = models.TextField(help_text="Markdown")
    is_published = models.BooleanField(default=True)

    class Meta:
        verbose_name = "صفحه"
        verbose_name_plural = "صفحات"

    def __str__(self):
        return self.title


class Faq(models.Model):
    category = models.CharField(max_length=64, default="general")
    question = models.CharField(max_length=300)
    answer = models.TextField()
    order = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["category", "order"]
        verbose_name = "سؤال متداول"
        verbose_name_plural = "سؤالات متداول"


class Banner(models.Model):
    title = models.CharField(max_length=200)
    subtitle = models.CharField(max_length=300, blank=True)
    image = models.ImageField(upload_to="banners/", blank=True)
    link = models.CharField(max_length=300, blank=True)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=100)

    class Meta:
        ordering = ["order"]
        verbose_name = "بنر"
        verbose_name_plural = "بنرها"
