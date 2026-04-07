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
    # Mid Mock: scored out of 100
    mid_mock = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    # Final Mock: scored out of 100; pass threshold = 70
    final_mock = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    # Final Exam: scored out of 1000; pass threshold = 700
    final_exam = models.FloatField(
        default=0,
        validators=[MinValueValidator(0), MaxValueValidator(1000)],
    )
    exam_date = models.DateField(null=True, blank=True)
    # Computed on save
    is_final_mock_pass = models.BooleanField(default=False, editable=False)
    is_pass = models.BooleanField(default=False, editable=False)
    # Normalised average: mid_mock (0-100), final_mock (0-100), final_exam scaled to 0-100
    total_percentage = models.FloatField(default=0, editable=False)

    class Meta:
        ordering = ["-total_percentage", "student__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "batch"],
                name="unique_result_per_student_per_batch",
            ),
        ]

    def save(self, *args, **kwargs):
        self.is_final_mock_pass = self.final_mock >= 70
        self.is_pass = self.final_exam >= 700
        # Normalise final_exam to 0-100 for a meaningful average
        final_exam_pct = self.final_exam / 10
        self.total_percentage = round(
            (self.mid_mock + self.final_mock + final_exam_pct) / 3, 2
        )
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        status = "PASS" if self.is_pass else "FAIL"
        return f"{self.student.name} - {self.batch.name} - {status}"
