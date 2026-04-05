from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import AuditLogMixin, RoleScopedQuerysetMixin

from .models import Result
from .serializers import ResultSerializer


class ResultViewSet(AuditLogMixin, RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = ResultSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "student__lab__trainer__user"

    def get_base_queryset(self):
        return Result.objects.select_related("student", "batch").order_by("-total_percentage")
