from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("MANAGER", "Manager"),
        ("TRAINER", "Trainer"),
        ("STUDENT", "Student"),
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="STUDENT",
        db_index=True,
        help_text="Role assigned to the user for access control in TMS.",
    )
    is_approved = models.BooleanField(
        default=False,
        help_text="Determines whether the user can log in to TMS.",
    )

    def save(self, *args, **kwargs):
        # Bootstrap superusers should never be blocked by the approval gate.
        if self.is_superuser:
            self.is_approved = True
        super().save(*args, **kwargs)

    def can_approve(self, target_user) -> bool:
        if self.role == "ADMIN":
            return target_user.role in {"MANAGER", "TRAINER"}

        if self.role in {"MANAGER", "TRAINER"}:
            return target_user.role == "STUDENT"

        return False

    def __str__(self) -> str:
        return self.get_username()
