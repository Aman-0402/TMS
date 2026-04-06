from django.db.models import Q
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
    approval_status = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ("id", "username", "email", "role", "is_approved", "is_rejected", "rejection_reason", "approval_status")
        read_only_fields = fields

    def get_approval_status(self, obj):
        if obj.is_approved:
            return "APPROVED"
        if obj.is_rejected:
            return "REJECTED"
        return "PENDING"


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


class UserProfileSerializer(serializers.ModelSerializer):
    """Used by any authenticated user to view / update their own profile."""
    current_password = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    new_password = serializers.CharField(write_only=True, required=False, allow_blank=True, min_length=8, default="")
    confirm_password = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")

    class Meta:
        model = User
        fields = (
            "id", "username", "email", "first_name", "last_name",
            "role", "is_approved", "date_joined", "last_login",
            "current_password", "new_password", "confirm_password",
        )
        read_only_fields = ("id", "username", "role", "is_approved", "date_joined", "last_login")

    def validate(self, attrs):
        new_pw  = attrs.get("new_password", "").strip()
        curr_pw = attrs.get("current_password", "").strip()
        conf_pw = attrs.get("confirm_password", "").strip()

        if new_pw:
            if not curr_pw:
                raise serializers.ValidationError(
                    {"current_password": "Current password is required to set a new password."}
                )
            user = self.instance
            if not user.check_password(curr_pw):
                raise serializers.ValidationError(
                    {"current_password": "Current password is incorrect."}
                )
            if new_pw != conf_pw:
                raise serializers.ValidationError(
                    {"confirm_password": "New passwords do not match."}
                )

        return attrs

    def update(self, instance, validated_data):
        new_pw = validated_data.pop("new_password", "").strip()
        validated_data.pop("current_password", None)
        validated_data.pop("confirm_password", None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if new_pw:
            instance.set_password(new_pw)

        instance.save()
        return instance


class AdminUserSerializer(serializers.ModelSerializer):
    """Used by Admin to list and update any user's profile."""
    approval_status = serializers.SerializerMethodField()
    full_name       = serializers.SerializerMethodField()
    batch_name      = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id", "username", "first_name", "last_name", "full_name",
            "email", "role", "is_approved", "is_rejected", "rejection_reason",
            "approval_status", "batch_name", "date_joined", "last_login", "is_active",
        )
        read_only_fields = (
            "id", "username", "role", "is_approved", "is_rejected",
            "rejection_reason", "approval_status", "batch_name",
            "date_joined", "last_login",
        )

    def get_approval_status(self, obj):
        if obj.is_approved:
            return "APPROVED"
        if obj.is_rejected:
            return "REJECTED"
        return "PENDING"

    def get_full_name(self, obj):
        return obj.get_full_name() or ""

    def get_batch_name(self, obj):
        # Trainer
        try:
            return obj.trainer_profile.batch.name
        except Exception:
            pass
        # Manager
        try:
            return obj.manager.batch.name
        except Exception:
            pass
        return ""

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


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
