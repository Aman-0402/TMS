from rest_framework import serializers

from .models import StudentAttendance, TrainerAttendance


class StudentAttendanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttendance
        fields = ("id", "student", "batch", "date", "status")
        read_only_fields = ("id",)

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        batch = attrs.get("batch", getattr(self.instance, "batch", None))

        if student and batch and student.batch_id != batch.id:
            raise serializers.ValidationError(
                {"batch": "Selected batch must match the student's batch."}
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
