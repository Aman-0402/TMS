from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import AuditLogMixin, RoleScopedQuerysetMixin
from accounts.permissions import IsAdminOrManager

from .models import Lab
from .serializers import LabSerializer


class LabViewSet(AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = LabSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "trainer__user"

    def get_permissions(self):
        if self.action in {"create", "update", "partial_update", "destroy"}:
            return [IsAuthenticated(), IsAdminOrManager()]

        return [IsAuthenticated()]

    def get_base_queryset(self):
        queryset = Lab.objects.select_related("batch", "trainer", "trainer__user")

        batch_id = self.request.query_params.get("batch")
        trainer_id = self.request.query_params.get("trainer")
        if batch_id:
            queryset = queryset.filter(batch_id=batch_id)
        if trainer_id:
            queryset = queryset.filter(trainer_id=trainer_id)

        return queryset.order_by(
            "batch__name",
            "created_at",
            "name",
            "id",
        )
