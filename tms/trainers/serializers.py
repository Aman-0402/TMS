from rest_framework import serializers

from labs.models import Lab

from .models import Trainer


class TrainerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    lab = serializers.PrimaryKeyRelatedField(
        queryset=Lab.objects.select_related("batch"),
        write_only=True,
        required=False,
        allow_null=True,
    )
    assigned_lab_names = serializers.SerializerMethodField()

    class Meta:
        model = Trainer
        fields = (
            "id",
            "user",
            "username",
            "email",
            "batch",
            "batch_name",
            "lab",
            "assigned_lab_names",
        )
        read_only_fields = ("id", "username", "email", "batch_name", "assigned_lab_names")

    def validate(self, attrs):
        batch = attrs.get("batch", getattr(self.instance, "batch", None))
        lab = attrs.get("lab")

        if lab and batch and lab.batch_id != batch.id:
            raise serializers.ValidationError(
                {"lab": "Assigned lab must belong to the same batch as the trainer."}
            )

        return attrs

    def create(self, validated_data):
        lab = validated_data.pop("lab", None)
        trainer, _ = Trainer.objects.update_or_create(
            user=validated_data["user"],
            defaults={"batch": validated_data["batch"]},
        )
        trainer.labs.exclude(batch=trainer.batch).update(trainer=None)

        if lab:
            lab.trainer = trainer
            lab.save(update_fields=["trainer"])

        return trainer

    def update(self, instance, validated_data):
        lab = validated_data.pop("lab", None)

        for attribute, value in validated_data.items():
            setattr(instance, attribute, value)

        instance.save()
        instance.labs.exclude(batch=instance.batch).update(trainer=None)

        if lab:
            lab.trainer = instance
            lab.save(update_fields=["trainer"])

        return instance

    def get_assigned_lab_names(self, obj):
        return list(obj.labs.order_by("name").values_list("name", flat=True))
