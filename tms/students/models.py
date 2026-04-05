from django.db import models


class Student(models.Model):
    name = models.CharField(max_length=255)
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="students",
    )
    lab = models.ForeignKey(
        "labs.Lab",
        on_delete=models.CASCADE,
        related_name="students",
    )

    class Meta:
        ordering = ["name"]
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "email"],
                name="unique_student_email_per_batch",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.name} - {self.batch.name}"
