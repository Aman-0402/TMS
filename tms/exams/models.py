from django.core.exceptions import ValidationError
from django.db import models


class Exam(models.Model):
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="exams",
    )
    exam_date = models.DateField(db_index=True)

    class Meta:
        ordering = ["-exam_date", "batch__name"]

    def __str__(self) -> str:
        return f"{self.batch.name} - {self.exam_date}"


class ExamSlot(models.Model):
    exam = models.ForeignKey(
        "exams.Exam",
        on_delete=models.CASCADE,
        related_name="slots",
    )
    start_time = models.TimeField()
    end_time = models.TimeField()
    lab = models.ForeignKey(
        "labs.Lab",
        on_delete=models.CASCADE,
        related_name="exam_slots",
    )

    class Meta:
        ordering = ["exam__exam_date", "start_time"]

    def clean(self):
        if self.end_time and self.start_time and self.end_time <= self.start_time:
            raise ValidationError({"end_time": "End time must be later than start time."})

        if self.exam_id and self.lab_id and self.lab.batch_id != self.exam.batch_id:
            raise ValidationError(
                {"lab": "Assigned lab must belong to the same batch as the exam."}
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.exam.batch.name} - {self.start_time} to {self.end_time} - {self.lab.name}"


class StudentExamSlot(models.Model):
    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="exam_slot_assignments",
    )
    exam_slot = models.ForeignKey(
        "exams.ExamSlot",
        on_delete=models.CASCADE,
        related_name="student_assignments",
    )

    class Meta:
        ordering = ["student__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "exam_slot"],
                name="unique_student_exam_slot_assignment",
            ),
        ]

    def clean(self):
        if self.student_id and self.exam_slot_id:
            if self.student.batch_id != self.exam_slot.exam.batch_id:
                raise ValidationError(
                    {"student": "Assigned student must belong to the same batch as the exam."}
                )

            duplicate_assignment = StudentExamSlot.objects.filter(
                student=self.student,
                exam_slot__exam=self.exam_slot.exam,
            )
            if self.pk:
                duplicate_assignment = duplicate_assignment.exclude(pk=self.pk)

            if duplicate_assignment.exists():
                raise ValidationError(
                    {"student": "This student is already assigned to a slot for the selected exam."}
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.student.name} - {self.exam_slot.exam.exam_date} - {self.exam_slot.lab.name}"
