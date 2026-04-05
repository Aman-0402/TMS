from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import AuditLogMixin, RoleScopedQuerysetMixin
from accounts.models import AuditLog
from accounts.permissions import IsAdmin

from .models import Batch, Course
from .serializers import BatchSerializer, CourseSerializer


class CourseViewSet(AuditLogMixin, viewsets.ModelViewSet):
    serializer_class = CourseSerializer
    permission_classes = [IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return Course.objects.all().order_by("name", "certification")


class BatchViewSet(AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "manager__user"
    trainer_lookup = "trainers__user"
    trainer_distinct = True

    def get_base_queryset(self):
        return Batch.objects.select_related("course", "created_by").order_by("-created_at")

    def perform_create(self, serializer):
        instance = serializer.save(created_by=self.request.user)
        self._log_audit_event(AuditLog.Action.CREATE, instance)
