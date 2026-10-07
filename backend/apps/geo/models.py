from django.db import models


class Province(models.Model):
    name = models.CharField("نام", max_length=64, unique=True)
    slug = models.SlugField("اسلاگ", max_length=64, unique=True, allow_unicode=True)

    class Meta:
        ordering = ["name"]
        verbose_name = "استان"
        verbose_name_plural = "استان‌ها"

    def __str__(self):
        return self.name


class City(models.Model):
    province = models.ForeignKey(Province, on_delete=models.PROTECT, related_name="cities", verbose_name="استان")
    name = models.CharField("نام", max_length=64)
    slug = models.SlugField("اسلاگ", max_length=64, unique=True, allow_unicode=True)
    lat = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    lng = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    is_popular = models.BooleanField("پرمراجعه", default=False)
    order = models.PositiveIntegerField(default=1000)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "شهر"
        verbose_name_plural = "شهرها"
        unique_together = [("province", "name")]

    def __str__(self):
        return self.name
