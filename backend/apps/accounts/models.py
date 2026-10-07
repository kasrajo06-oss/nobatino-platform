from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel
from apps.core.utils import normalize_mobile, validate_national_code


class Gender(models.TextChoices):
    MALE = "male", "مرد"
    FEMALE = "female", "زن"


class Role(models.TextChoices):
    PATIENT = "patient", "بیمار"
    DOCTOR = "doctor", "پزشک"
    CENTER_STAFF = "center_staff", "کارمند مرکز درمانی"
    OPERATOR = "operator", "اپراتور"
    SUPERADMIN = "superadmin", "مدیر کل"


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, mobile, password=None, **extra):
        mobile = normalize_mobile(mobile)
        user = self.model(mobile=mobile, **extra)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, mobile, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("role", Role.SUPERADMIN)
        return self.create_user(mobile, password, **extra)


class User(AbstractBaseUser, PermissionsMixin):
    mobile = models.CharField("موبایل", max_length=11, unique=True)
    first_name = models.CharField("نام", max_length=64, blank=True)
    last_name = models.CharField("نام خانوادگی", max_length=64, blank=True)
    national_code = models.CharField("کد ملی", max_length=10, blank=True, validators=[validate_national_code])
    gender = models.CharField("جنسیت", max_length=8, choices=Gender.choices, blank=True)
    birth_date = models.DateField("تاریخ تولد", null=True, blank=True)
    email = models.EmailField("ایمیل", blank=True)
    insurance = models.ForeignKey(
        "catalog.Insurance", on_delete=models.SET_NULL, null=True, blank=True, verbose_name="بیمه"
    )
    role = models.CharField("نقش", max_length=16, choices=Role.choices, default=Role.PATIENT, db_index=True)
    is_active = models.BooleanField("فعال", default=True)
    is_staff = models.BooleanField("دسترسی ادمین جنگو", default=False)
    date_joined = models.DateTimeField("تاریخ عضویت", default=timezone.now)

    objects = UserManager()

    USERNAME_FIELD = "mobile"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"

    def __str__(self):
        return self.full_name or self.mobile

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()

    @property
    def profile_completed(self):
        return bool(self.first_name and self.last_name and self.national_code)


class FamilyMember(TimeStampedModel):
    class Relation(models.TextChoices):
        CHILD = "child", "فرزند"
        SPOUSE = "spouse", "همسر"
        PARENT = "parent", "والدین"
        SIBLING = "sibling", "خواهر/برادر"
        OTHER = "other", "سایر"

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="family_members")
    first_name = models.CharField("نام", max_length=64)
    last_name = models.CharField("نام خانوادگی", max_length=64)
    national_code = models.CharField("کد ملی", max_length=10, validators=[validate_national_code])
    gender = models.CharField("جنسیت", max_length=8, choices=Gender.choices)
    birth_date = models.DateField("تاریخ تولد", null=True, blank=True)
    relation = models.CharField("نسبت", max_length=16, choices=Relation.choices, default=Relation.OTHER)

    class Meta:
        verbose_name = "عضو خانواده"
        verbose_name_plural = "اعضای خانواده"
        unique_together = [("owner", "national_code")]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"
