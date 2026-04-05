from rest_framework import viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import BasePermission, IsAuthenticated

from accounts.models import Manager
from accounts.permissions import IsAdmin, IsManager, IsTrainer

from .models import Student
from .serializers import StudentSerializer


class DenyAllPermission(BasePermission):
    def has_permission(self, request, view):
        return False


class StudentViewSet(viewsets.ModelViewSet):
    serializer_class = StudentSerializer
    permission_classes = [IsAuthenticated]

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

    def get_queryset(self):
        user = self.request.user
        base_queryset = Student.objects.select_related("batch", "lab").order_by("name")

        if user.role == "ADMIN":
            return base_queryset
        if user.role == "MANAGER":
            return base_queryset.filter(batch__manager__user=user)
        if user.role == "TRAINER":
            return base_queryset.filter(lab__trainer__user=user)

        return base_queryset.none()

    def perform_create(self, serializer):
        self._validate_write_scope(serializer)
        serializer.save()

    def perform_update(self, serializer):
        self._validate_write_scope(serializer)
        serializer.save()

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
