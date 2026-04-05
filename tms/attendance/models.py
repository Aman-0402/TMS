from django.db import models


class WorkingDay(models.Model):
    batch = models.ForeignKey(
        "batch.Batch",
        on_delete=models.CASCADE,
        related_name="working_days",
    )
    date = models.DateField(db_index=True)
    created_by = models.ForeignKey(
        "accounts.User",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_working_days",
    )

    class Meta:
        ordering = ["date"]
        constraints = [
            models.UniqueConstraint(
                fields=["batch", "date"],
                name="unique_working_day_per_batch",
            )
        ]

    def __str__(self) -> str:
        return f"{self.batch.name} - {self.date}"


class StudentAttendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "PRESENT", "Present"
        ABSENT = "ABSENT", "Absent"
        LATE = "LATE", "Late"

    class Slot(models.TextChoices):
        SLOT_1 = "1", "Slot 1"
        SLOT_2 = "2", "Slot 2"
        SLOT_3 = "3", "Slot 3"

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
    slot = models.CharField(
        max_length=1,
        choices=Slot.choices,
        default=Slot.SLOT_1,
        db_index=True,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PRESENT,
    )

    class Meta:
        ordering = ["-date", "slot", "student__name"]
        constraints = [
            models.UniqueConstraint(
                fields=["student", "date", "slot"],
                name="unique_student_attendance_per_slot",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.student.name} - {self.date} - Slot {self.slot} - {self.status}"


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
