from django.conf import settings
from django.db import models


class Trainer(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trainer_profile",
    )
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="trainers",
    )

    class Meta:
        ordering = ["user__username"]

    def __str__(self) -> str:
        return f"{self.user.username} - {self.batch.name}"
