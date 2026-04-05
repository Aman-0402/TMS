from django.db import models


class StudentAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"

    student = models.ForeignKey(
        "students.Student",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="student_attendance_records",
    )
    date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
    )

    class Meta:
        ordering = ["-date", "student__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "date"],
                name="unique_student_attendance_per_day",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student.name} - {self.date} - {self.status}"


class TrainerAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        LATE = "LATE", "Late"
        HALF_DAY = "HALF_DAY", "Half Day"
        ABSENT = "ABSENT", "Absent"
        LEAVE = "LEAVE", "Leave"

    trainer = models.ForeignKey(
        "trainers.Trainer",
        on_delete=models.CASCADE,
        related_name="attendance_records",
    )
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="trainer_attendance_records",
    )
    date = models.DateField(db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
    )

    class Meta:
        ordering = ["-date", "trainer__user__username"]
        constraints = [
            models.UniqueConstraint(
                fields=["trainer", "date"],
                name="unique_trainer_attendance_per_day",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.trainer.user.username} - {self.date} - {self.status}"
