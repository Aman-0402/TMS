from rest_framework import serializers

from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    lab_name = serializers.CharField(source="lab.name", read_only=True)

    class Meta:
        model = Student
        fields = (
            "id",
            "name",
            "email",
            "phone",
            "batch",
            "batch_name",
            "lab",
            "lab_name",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        batch = attrs.get("batch", getattr(self.instance, "batch", None))
        lab = attrs.get("lab", getattr(self.instance, "lab", None))

        if batch and lab and lab.batch_id != batch.id:
            raise serializers.ValidationError(
                {"lab": "Assigned lab must belong to the same batch as the student."}
            )

        return attrs
