from django.core.exceptions import ValidationError
from django.db import models


class Certificate(models.Model):
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="certificates",
    )
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="certificates",
    )
    certificate_name = models.CharField(max_length=255)
    voucher_code = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-issued_at", "student__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "batch"],
                name="unique_certificate_per_student_per_batch",
            ),
        ]

    def clean(self):
        if self.student_id and self.batch_id:
            if self.student.batch_id != self.batch_id:
                raise ValidationError(
                    {"batch": "Selected batch must match the student's batch."}
                )

            result = self.student.results.filter(batch_id=self.batch_id).first()
            if not result or not result.is_pass:
                raise ValidationError(
                    {"student": "Certificates can only be issued to students with PASS result."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.certificate_name} - {self.student.name} - {self.batch.name}"
