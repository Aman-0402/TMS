from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated

from accounts.mixins import RoleScopedQuerysetMixin
from accounts.models import Manager
from accounts.permissions import IsAdmin, IsManager, IsTrainer

from .models import Student
from .serializers import StudentSerializer


class DenyAllPermission(BasePermission):
    def has_permission(self, request, view):
        return False


class StudentViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "lab__trainer__user"

    def get_permissions(self):
        role_permission_map = {
            "ADMIN": IsAdmin,
            "MANAGER": IsManager,
            "TRAINER": IsTrainer,
        }
        role = getattr(self.request.user, "role", None)
        permission_class = role_permission_map.get(role, DenyAllPermission)

        if self.action in {"list", "retrieve", "create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), permission_class()]

        return [IsAuthenticated()]

    def get_base_queryset(self):
        return Student.objects.select_related("batch", "lab", "lab__trainer").order_by("name")

    def perform_create(self, serializer):
        self._validate_write_scope(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._assert_user_can_modify_student(serializer.instance)
        self._validate_write_scope(serializer)
        serializer.save()

    def perform_destroy(self, instance):
        self._assert_user_can_modify_student(instance)
        instance.delete()

    def _assert_user_can_modify_student(self, student):
        user = self.request.user

        if user.role == "ADMIN":
            return

        if user.role == "MANAGER":
            if not Manager.objects.filter(user=user, batch=student.batch).exists():
                raise PermissionDenied("Managers can only modify students in their assigned batch.")
            return

        if user.role == "TRAINER":
            if student.lab.trainer.user_id != user.id:
                raise PermissionDenied("Trainers can only modify students in their assigned lab.")
            return

        raise PermissionDenied("You do not have permission to modify this student.")

    def _validate_write_scope(self, serializer):
        user = self.request.user
        batch = serializer.validated_data.get("batch", getattr(serializer.instance, "batch", None))
        lab = serializer.validated_data.get("lab", getattr(serializer.instance, "lab", None))

        if user.role == "ADMIN":
            return

        if user.role == "MANAGER":
            if not batch or not Manager.objects.filter(user=user, batch=batch).exists():
                raise PermissionDenied("Managers can only manage students in their assigned batch.")
            return

        if user.role == "TRAINER":
            if not lab or lab.trainer.user_id != user.id:
                raise PermissionDenied("Trainers can only manage students in their assigned lab.")
            return

        raise PermissionDenied("You do not have permission to manage students.")
