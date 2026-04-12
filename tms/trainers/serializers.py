import logging

from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from rest_framework import serializers

from batch.models import Batch
from labs.models import Lab

from .models import Trainer


logger = logging.getLogger(__name__)
User = get_user_model()


class TrainerSerializer(serializers.ModelSerializer):
    user = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(
            role="TRAINER",
            is_approved=True,
            is_active=True,
        )
    )
    batch = serializers.PrimaryKeyRelatedField(
        queryset=Batch.objects.filter(
            is_deleted=False,
            is_active=True,
        )
    )
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)
    lab = serializers.PrimaryKeyRelatedField(
        queryset=Lab.objects.select_related("batch"),
        write_only=True,
        required=False,
        allow_null=True,
    )
    current_lab_id = serializers.SerializerMethodField()
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
            "current_lab_id",
            "assigned_lab_names",
        )
        read_only_fields = ("id", "username", "email", "batch_name", "current_lab_id", "assigned_lab_names")

    def to_internal_value(self, data):
        normalized_data = data.copy() if hasattr(data, "copy") else dict(data)

        if "trainer_id" in normalized_data and "user" not in normalized_data:
            normalized_data["user"] = normalized_data["trainer_id"]

        if "batch_id" in normalized_data and "batch" not in normalized_data:
            normalized_data["batch"] = normalized_data["batch_id"]

        if "lab_id" in normalized_data and "lab" not in normalized_data:
            normalized_data["lab"] = normalized_data["lab_id"]

        return super().to_internal_value(normalized_data)

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

        try:
            with transaction.atomic():
                trainer, _ = Trainer.objects.update_or_create(
                    user=validated_data["user"],
                    defaults={"batch": validated_data["batch"]},
                )
                self._assign_lab(trainer, lab)
                return trainer
        except IntegrityError as exc:
            logger.exception("Failed to create trainer assignment.")
            raise serializers.ValidationError({"error": str(exc)})

    def update(self, instance, validated_data):
        lab = validated_data.pop("lab", None)

        try:
            with transaction.atomic():
                for attribute, value in validated_data.items():
                    setattr(instance, attribute, value)

                instance.save()
                self._assign_lab(instance, lab)
                return instance
        except IntegrityError as exc:
            logger.exception("Failed to update trainer assignment.")
            raise serializers.ValidationError({"error": str(exc)})

    def _assign_lab(self, trainer, lab):
        trainer.labs.all().update(trainer=None)

        if lab is None:
            return

        if lab.batch_id != trainer.batch_id:
            raise serializers.ValidationError(
                {"lab": "Assigned lab must belong to the same batch as the trainer."}
            )

        lab.trainer = trainer
        lab.save(update_fields=["trainer"])

    def get_current_lab_id(self, obj):
        return (
            obj.labs.order_by("created_at", "name", "id").values_list("id", flat=True).first()
        )

    def get_assigned_lab_names(self, obj):
        return list(obj.labs.order_by("created_at", "name", "id").values_list("name", flat=True))
