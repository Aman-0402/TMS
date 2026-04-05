from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import AuditLog, Manager, User


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["role"] = self.user.role
        data["username"] = self.user.username
        return data


class RegisterSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=(
            ("MANAGER", "Manager"),
            ("TRAINER", "Trainer"),
            ("STUDENT", "Student"),
        )
    )
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "role")

    def create(self, validated_data):
        return User.objects.create_user(
            username=validated_data["username"],
            email=validated_data["email"],
            password=validated_data["password"],
            role=validated_data["role"],
            is_approved=False,
        )


class PendingUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_approved")
        read_only_fields = fields


class AuditLogSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    model = serializers.CharField(source="model_name", read_only=True)
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)

    class Meta:
        model = AuditLog
        fields = ("id", "user", "action", "model", "object_id", "timestamp")
        read_only_fields = fields

    def get_user(self, obj):
        return obj.user.username if obj.user else "System"


class AvailableTrainerUserSerializer(serializers.ModelSerializer):
    trainer_profile_id = serializers.SerializerMethodField()
    current_batch = serializers.SerializerMethodField()
    current_batch_name = serializers.SerializerMethodField()
    assigned_lab_names = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "trainer_profile_id",
            "current_batch",
            "current_batch_name",
            "assigned_lab_names",
        )
        read_only_fields = fields

    def _get_trainer_profile(self, obj):
        try:
            return obj.trainer_profile
        except User.trainer_profile.RelatedObjectDoesNotExist:
            return None

    def get_trainer_profile_id(self, obj):
        trainer = self._get_trainer_profile(obj)
        return trainer.id if trainer else None

    def get_current_batch(self, obj):
        trainer = self._get_trainer_profile(obj)
        return trainer.batch_id if trainer else None

    def get_current_batch_name(self, obj):
        trainer = self._get_trainer_profile(obj)
        return trainer.batch.name if trainer else ""

    def get_assigned_lab_names(self, obj):
        trainer = self._get_trainer_profile(obj)
        if not trainer:
            return []

        return list(trainer.labs.order_by("name").values_list("name", flat=True))


class AvailableManagerUserSerializer(serializers.ModelSerializer):
    manager_profile_id = serializers.SerializerMethodField()
    current_batch = serializers.SerializerMethodField()
    current_batch_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "email",
            "role",
            "manager_profile_id",
            "current_batch",
            "current_batch_name",
        )
        read_only_fields = fields

    def _get_manager_profile(self, obj):
        try:
            return obj.manager
        except User.manager.RelatedObjectDoesNotExist:
            return None

    def get_manager_profile_id(self, obj):
        manager = self._get_manager_profile(obj)
        return manager.id if manager else None

    def get_current_batch(self, obj):
        manager = self._get_manager_profile(obj)
        return manager.batch_id if manager else None

    def get_current_batch_name(self, obj):
        manager = self._get_manager_profile(obj)
        return manager.batch.name if manager else ""


class ManagerSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)
    batch_name = serializers.CharField(source="batch.name", read_only=True)

    class Meta:
        model = Manager
        fields = ("id", "user", "username", "email", "batch", "batch_name")
        read_only_fields = ("id", "username", "email", "batch_name")

    def create(self, validated_data):
        manager, _ = Manager.objects.update_or_create(
            user=validated_data["user"],
            defaults={"batch": validated_data["batch"]},
        )
        return manager
