from rest_framework import serializers

from .models import Result


class ResultSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source="student.name", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)

    class Meta:
        model = Result
        fields = (
            "id",
            "student",
            "student_name",
            "batch",
            "batch_name",
            "mid_mock",
            "final_mock",
            "final_exam",
            "exam_date",
            "is_final_mock_pass",
            "total_percentage",
            "is_pass",
        )
        read_only_fields = ("id", "student_name", "batch_name", "is_final_mock_pass", "total_percentage", "is_pass")

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        batch = attrs.get("batch", getattr(self.instance, "batch", None))

        if student and batch and student.batch_id != batch.id:
            raise serializers.ValidationError(
                {"batch": "Selected batch must match the student's batch."}
            )

        return attrs
