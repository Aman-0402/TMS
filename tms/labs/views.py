from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Lab
from .serializers import LabSerializer


class LabViewSet(viewsets.ModelViewSet):
    serializer_class = LabSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Lab.objects.select_related("batch", "trainer", "trainer__user").order_by("name")

        if user.role == "ADMIN":
            return base_queryset
        if user.role == "MANAGER":
            return base_queryset.filter(batch__manager__user=user)
        if user.role == "TRAINER":
            return base_queryset.filter(trainer__user=user)

        return base_queryset.none()
