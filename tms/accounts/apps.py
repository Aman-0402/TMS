import os

from django.apps import AppConfig
from django.contrib.auth import get_user_model
from django.db.models.signals import post_migrate


def ensure_default_admin(sender, **kwargs):
    username = os.getenv("DEFAULT_ADMIN_USERNAME", "").strip()
    password = os.getenv("DEFAULT_ADMIN_PASSWORD", "").strip()

    if not username or not password:
        return

    email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com").strip() or "admin@example.com"
    User = get_user_model()

    user, created = User.objects.get_or_create(username=username)
    user.is_superuser = True
    user.is_staff = True
    user.is_approved = True
    user.role = "ADMIN"
    user.email = email
    user.set_password(password)
    user.save()

    if created:
        print("Created default admin user from environment configuration.")


class AccountsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "accounts"

    def ready(self):
        post_migrate.connect(ensure_default_admin, sender=self)
