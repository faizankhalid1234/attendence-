import os
from django.core.management.base import BaseCommand
from attendance.models import Role, User
from attendance.utils import hash_password


class Command(BaseCommand):
    help = "Seed or update the super admin user"

    def handle(self, *args, **options):
        email = (os.getenv("SUPER_ADMIN_EMAIL", "") or "").lower()
        password = os.getenv("SUPER_ADMIN_PASSWORD", "")
        name = os.getenv("SUPER_ADMIN_NAME", "Super Admin")

        if not email or not password:
            raise ValueError("SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are required")

        user, _created = User.objects.update_or_create(
            email=email,
            defaults={
                "name": name,
                "password_hash": hash_password(password),
                "role": Role.SUPER_ADMIN,
                "company": None,
            },
        )
        self.stdout.write(self.style.SUCCESS(f"Super admin ready: {user.email}"))
