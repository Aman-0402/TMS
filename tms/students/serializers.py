from rest_framework import serializers

from .models import Student


class StudentSerializer(serializers.ModelSerializer):
    ug_number = serializers.CharField()
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    lab_name = serializers.CharField(source="lab.name", read_only=True)
    trainer_id = serializers.IntegerField(source="lab.trainer_id", read_only=True)
    trainer_name = serializers.CharField(source="lab.trainer.user.username", read_only=True)
    mock_status = serializers.SerializerMethodField()
    final_status = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = (
            "id",
            "ug_number",
            "name",
            "department",
            "email",
            "phone",
            "batch",
            "batch_name",
            "lab",
            "lab_name",
            "trainer_id",
            "trainer_name",
            "mock_status",
            "final_status",
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

    def get_mock_status(self, obj):
        result = obj.results.filter(batch=obj.batch).only("mid_mock").first()
        if not result:
            return "PENDING"

        return "PASS" if result.mid_mock >= 70 else "FAIL"

    def get_final_status(self, obj):
        result = obj.results.filter(batch=obj.batch).only("is_final_mock_pass").first()
        if not result:
            return "PENDING"

        return "PASS" if result.is_final_mock_pass else "FAIL"
