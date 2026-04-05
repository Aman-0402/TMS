from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Result(models.Model):
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="results",
    )
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="results",
    )
    mid_test = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    final_mock = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    final_exam = models.FloatField(validators=[MinValueValidator(0), MaxValueValidator(100)])
    total_percentage = models.FloatField(default=0, editable=False)
    is_pass = models.BooleanField(default=False, editable=False)

    class Meta:
        ordering = ["-total_percentage", "student__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "batch"],
                name="unique_result_per_student_per_batch",
            ),
        ]

    def save(self, *args, **kwargs):
        total = (self.mid_test + self.final_mock + self.final_exam) / 3
        self.total_percentage = round(total, 2)
        self.is_pass = self.total_percentage >= 40
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        status = "PASS" if self.is_pass else "FAIL"
        return f"{self.student.name} - {self.batch.name} - {status}"
