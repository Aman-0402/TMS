from rest_framework import serializers

from .models import Certificate


class CertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = (
            "id",
            "student",
            "batch",
            "certificate_name",
            "voucher_code",
            "issued_at",
        )
        read_only_fields = ("id", "issued_at")

    def validate(self, attrs):
        student = attrs.get("student", getattr(self.instance, "student", None))
        batch = attrs.get("batch", getattr(self.instance, "batch", None))

        if student and batch:
            if student.batch_id != batch.id:
                raise serializers.ValidationError(
                    {"batch": "Selected batch must match the student's batch."}
                )

            result = student.results.filter(batch=batch).first()
            if not result or not result.is_pass:
                raise serializers.ValidationError(
                    {"student": "Certificates can only be issued to students with PASS result."}
                )

        return attrs
