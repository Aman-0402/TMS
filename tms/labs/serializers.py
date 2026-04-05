from rest_framework import serializers

from .models import Lab


class LabSerializer(serializers.ModelSerializer):
    batch_name = serializers.CharField(source="batch.name", read_only=True)

    class Meta:
        model = Lab
        fields = ("id", "name", "batch", "batch_name", "trainer")
        read_only_fields = ("id",)

    def validate(self, attrs):
        batch = attrs.get("batch", getattr(self.instance, "batch", None))
        trainer = attrs.get("trainer", getattr(self.instance, "trainer", None))

        if batch and trainer and trainer.batch_id != batch.id:
            raise serializers.ValidationError(
                {"trainer": "Assigned trainer must belong to the same batch as the lab."}
            )

        return attrs
