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
    is_rejected = models.BooleanField(
        default=False,
        help_text="Set when an approver rejects this account.",
    )
    rejection_reason = models.TextField(blank=True, default="")

    def save(self, *args, **kwargs):
        # Bootstrap superusers should never be blocked by the approval gate.
        if self.is_superuser:
            self.is_approved = True
        super().save(*args, **kwargs)

    def can_approve(self, target_user) -> bool:
        if self.role == "ADMIN":
            return target_user.role in {"MANAGER", "TRAINER"}
        if self.role == "MANAGER":
            return target_user.role in {"TRAINER", "STUDENT"}
        return False

    def __str__(self) -> str:
        return self.get_username()


class Manager(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    batch = models.ForeignKey("batch.Batch", on_delete=models.CASCADE)

    def __str__(self):
        return self.user.username


class AuditLog(models.Model):
    class Action(models.TextChoices):
        CREATE = "CREATE", "Create"
        UPDATE = "UPDATE", "Update"
        DELETE = "DELETE", "Delete"

    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=10, choices=Action.choices, db_index=True)
    model_name = models.CharField(max_length=100, db_index=True)
    object_id = models.PositiveBigIntegerField(db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        actor = self.user.username if self.user else "System"
        return f"{actor} - {self.action} - {self.model_name}#{self.object_id}"
