from rest_framework import serializers

from .models import StudentAttendance, TrainerAttendance, WorkingDay


class WorkingDaySerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)

    class Meta:
        model = WorkingDay
        fields = ("id", "batch", "batch_name", "date")
        read_only_fields = ("id", "batch_name")

    def validate(self, attrs):
        batch = attrs.get("batch", getattr(self.instance, "batch", None))
        date = attrs.get("date", getattr(self.instance, "date", None))

        if batch and date:
            if date < batch.start_date or date > batch.end_date:
                raise serializers.ValidationError(
                    {"date": "Date must be within the batch start and end dates."}
                )

        return attrs


class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)

    class Meta:
        model = StudentAttendance
        fields = ("id", "student", "student_name", "batch", "date", "status")
        read_only_fields = ("id", "student_name")

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        batch = attrs.get("batch", getattr(self.instance, "batch", None))
        date = attrs.get("date", getattr(self.instance, "date", None))

        if student and batch and student.batch_id != batch.id:
            raise serializers.ValidationError(
                {"batch": "Selected batch must match the student's batch."}
            )

        if batch and date:
            if not WorkingDay.objects.filter(batch=batch, date=date).exists():
                raise serializers.ValidationError(
                    {"date": "Selected date is not a working day for this batch."}
                )

        return attrs


class TrainerAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrainerAttendance
        fields = ("id", "trainer", "batch", "date", "status")
        read_only_fields = ("id",)

    def validate(self, attrs):
        trainer = attrs.get("trainer", getattr(self.instance, "trainer", None))
        batch = attrs.get("batch", getattr(self.instance, "batch", None))

        if trainer and batch and trainer.batch_id != batch.id:
            raise serializers.ValidationError(
                {"batch": "Selected batch must match the trainer's batch."}
            )

        return attrs
