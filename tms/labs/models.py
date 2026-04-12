from django.db import models


class Lab(models.Model):
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="labs",
    )
    trainer = models.ForeignKey(
        "trainers.Trainer",
        on_delete=models.CASCADE,
        related_name="labs",
        null=True,
        blank=True,
    )

    class Meta:
        ordering = ["batch__name", "created_at", "name", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "name"],
                name="unique_lab_name_per_batch",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.batch.name}"
