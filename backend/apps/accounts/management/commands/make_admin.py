"""Create (or promote) a user who logs in with OTP and give them an admin role.

    python manage.py make_admin 09121234567 --role superadmin
"""
from django.core.management.base import BaseCommand

from apps.accounts.models import Role, User
from apps.core.utils import normalize_mobile


class Command(BaseCommand):
    help = "Give a mobile number the operator or superadmin role."

    def add_arguments(self, parser):
        parser.add_argument("mobile")
        parser.add_argument("--role", choices=[Role.OPERATOR, Role.SUPERADMIN], default=Role.SUPERADMIN)
        parser.add_argument("--first-name", default="")
        parser.add_argument("--last-name", default="")

    def handle(self, *args, **o):
        mobile = normalize_mobile(o["mobile"])
        user, created = User.objects.get_or_create(mobile=mobile)
        user.role = o["role"]
        user.is_staff = True
        user.is_superuser = o["role"] == Role.SUPERADMIN
        if o["first_name"]:
            user.first_name = o["first_name"]
        if o["last_name"]:
            user.last_name = o["last_name"]
        user.save()
        self.stdout.write(self.style.SUCCESS(f"{'Created' if created else 'Updated'} {mobile} as {user.role}. Log in with OTP at /login."))
