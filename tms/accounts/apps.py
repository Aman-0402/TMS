from django.apps import AppConfig

class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'

    def ready(self):
        import os
        from django.contrib.auth import get_user_model

        User = get_user_model()

        # Prevent duplicate creation
        if not User.objects.filter(username="admin").exists():
            print("🔥 Creating default superuser...")

            User.objects.create_superuser(
                username="admin",
                email="admin@gmail.com",
                password="admin123"
            )