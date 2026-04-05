from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from accounts.mixins import RoleScopedQuerysetMixin

from .models import Lab
from .serializers import LabSerializer


class LabViewSet(RoleScopedQuerysetMixin, viewsets.ModelViewSet):
    serializer_class = LabSerializer
    permission_classes = [IsAuthenticated]
    manager_lookup = "batch__manager__user"
    trainer_lookup = "trainer__user"

    def get_base_queryset(self):
        return Lab.objects.select_related("batch", "trainer", "trainer__user").order_by("name")
