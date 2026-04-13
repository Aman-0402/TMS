from django.db.models import Count, Q
from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import (
    AuditLogMixin,
    RequestDebugMixin,
    RoleScopedQuerysetMixin,
    SoftDeleteMixin,
)
from accounts.models import AuditLog
from accounts.permissions import IsAdminOrManager

from .models import Batch, Course
from .serializers import BatchSerializer, CourseSerializer


class CourseViewSet(SoftDeleteMixin, RequestDebugMixin, AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated]
    delete_error_message = "Unable to delete this course."
    restore_error_message = "Unable to restore this course."

    def get_permissions(self):
        self.debug_request_user("get_permissions")
        if self.action in {"create", "update", "partial_update", "destroy", "restore"}:
            return [IsAuthenticated(), IsAdminOrManager()]

        return [IsAuthenticated()]

    def get_base_queryset(self):
        return Course.objects.all().order_by("name", "certification")

    def get_queryset(self):
        self.debug_request_user("get_queryset")
        return self.get_base_queryset().filter(is_deleted=False)

    def validate_soft_delete(self, instance):
        if instance.batches.filter(is_deleted=False).exists():
            raise ValidationError("Cannot delete. Related data exists.")


class BatchViewSet(SoftDeleteMixin, AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]
    delete_error_message = "Unable to delete this batch."
    restore_error_message = "Unable to restore this batch."
    manager_lookup = "manager__user"
    trainer_lookup = "trainers__user"
    trainer_distinct = True

    def get_permissions(self):
        self.debug_request_user("get_permissions")
        if self.action in {"create", "update", "partial_update", "destroy", "restore"}:
            return [IsAuthenticated(), IsAdminOrManager()]

        return [IsAuthenticated()]

    def get_base_queryset(self):
        return (
            Batch.objects.select_related("course", "created_by")
            .annotate(
                student_count=Count("students", filter=Q(students__is_deleted=False), distinct=True),
                lab_count=Count("labs", distinct=True),
            )
            .order_by("-created_at")
        )

    def get_queryset(self):
        self.debug_request_user("get_queryset")
        queryset = self.get_base_queryset().filter(is_deleted=False)
        role = getattr(self.request.user, "role", None)

        if role in {"ADMIN", "MANAGER"}:
            return queryset

        if role == "TRAINER":
            return queryset.filter(trainers__user=self.request.user).distinct()

        return queryset.none()

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._log_audit_event(AuditLog.Action.CREATE, instance)

    def validate_soft_delete(self, instance):
        if instance.students.filter(is_deleted=False).exists():
            raise ValidationError("Cannot delete. Related data exists.")
