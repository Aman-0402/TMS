from django.apps import AppConfig
from django.db.utils import OperationalError, ProgrammingError

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        from django.contrib.auth import get_user_model

        User = get_user_model()

        try:
            # Get or create admin user (idempotent - safe to run multiple times)
            user, created = User.objects.get_or_create(username="admin")
        except (OperationalError, ProgrammingError):
            # App startup can happen before the database is created or migrated.
            # In that case, skip bootstrap and let the next successful startup handle it.
            return

        # Update user properties
        user.is_superuser = True
        user.is_staff = True
        user.is_approved = True
        user.role = "ADMIN"  # 🔥 IMPORTANT - matches your User model
        user.email = "admin@gmail.com"
        user.set_password("admin123")
        user.save()

        if created:
            print("🔥 Created default admin superuser")
        else:
            print("✅ Admin superuser already exists (updated)")
