from django.conf import settings
from django.db import models


class Trainer(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="trainer_profiles",
    )
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="trainers",
    )

    class Meta:
        ordering = ["user__username"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "batch"],
                name="unique_trainer_per_batch",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.user.username} - {self.batch.name}"
