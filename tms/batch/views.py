from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import AuditLogMixin, RoleScopedQuerysetMixin

from .models import Batch
from .serializers import BatchSerializer


class BatchViewSet(AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "manager__user"
    trainer_lookup = "trainers__user"
    trainer_distinct = True

    def get_base_queryset(self):
        return Batch.objects.all().order_by("-created_at")
