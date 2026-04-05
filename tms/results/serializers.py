from rest_framework import serializers

from .models import Result


class ResultSerializer(serializers.ModelSerializer):
    class Meta:
        model = Result
        fields = (
            "id",
            "student",
            "batch",
            "mid_test",
            "final_mock",
            "final_exam",
            "total_percentage",
            "is_pass",
        )
        read_only_fields = ("id", "total_percentage", "is_pass")

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        batch = attrs.get("batch", getattr(self.instance, "batch", None))

        if student and batch and student.batch_id != batch.id:
            raise serializers.ValidationError(
                {"batch": "Selected batch must match the student's batch."}
            )

        return attrs
