from django.db import models


class Specialty(models.Model):
    """تخصص یا فوق‌تخصص (parent != null)."""

    parent = models.ForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children", verbose_name="تخصص والد"
    )
    name = models.CharField("نام", max_length=128)
    title = models.CharField("عنوان پزشک", max_length=160, help_text="مثلاً: متخصص قلب و عروق")
    slug = models.SlugField("اسلاگ", max_length=128, unique=True, allow_unicode=True)
    icon = models.CharField("آیکون", max_length=64, blank=True)
    description = models.TextField("توضیحات", blank=True)
    is_popular = models.BooleanField("پرمراجعه", default=False)
    order = models.PositiveIntegerField(default=1000)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "تخصص"
        verbose_name_plural = "تخصص‌ها"

    def __str__(self):
        return self.name


class Degree(models.Model):
    name = models.CharField("نام", max_length=64, unique=True)
    slug = models.SlugField(max_length=64, unique=True, allow_unicode=True)
    order = models.PositiveIntegerField(default=1000)

    class Meta:
        ordering = ["order"]
        verbose_name = "مدرک"
        verbose_name_plural = "مدارک"

    def __str__(self):
        return self.name


class Condition(models.Model):
    """بیماری یا خدمت (برای صفحات «بهترین پزشک برای ...»)."""

    name = models.CharField("نام", max_length=128, unique=True)
    slug = models.SlugField(max_length=128, unique=True, allow_unicode=True)
    specialties = models.ManyToManyField(Specialty, related_name="conditions", verbose_name="تخصص‌های مرتبط")
    synonyms = models.CharField("مترادف‌ها", max_length=255, blank=True)
    description = models.TextField("توضیحات", blank=True)
    is_popular = models.BooleanField("پرمراجعه", default=False)

    class Meta:
        ordering = ["name"]
        verbose_name = "بیماری/خدمت"
        verbose_name_plural = "بیماری‌ها و خدمات"

    def __str__(self):
        return self.name


class Insurance(models.Model):
    class Kind(models.TextChoices):
        BASIC = "basic", "پایه"
        SUPPLEMENTARY = "supplementary", "تکمیلی"

    name = models.CharField("نام", max_length=128, unique=True)
    slug = models.SlugField(max_length=128, unique=True, allow_unicode=True)
    kind = models.CharField("نوع", max_length=16, choices=Kind.choices, default=Kind.BASIC)
    logo = models.ImageField(upload_to="insurances/", blank=True)
    order = models.PositiveIntegerField(default=1000)

    class Meta:
        ordering = ["order", "name"]
        verbose_name = "بیمه"
        verbose_name_plural = "بیمه‌ها"

    def __str__(self):
        return self.name
