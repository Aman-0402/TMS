from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from .models import Batch
from .serializers import BatchSerializer


class BatchViewSet(viewsets.ModelViewSet):
    serializer_class = BatchSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Batch.objects.all().order_by("-created_at")

        if user.role == "ADMIN":
            return base_queryset
        if user.role == "MANAGER":
            return base_queryset.filter(manager__user=user)
        if user.role == "TRAINER":
            return base_queryset.filter(trainers__user=user).distinct()

        return base_queryset.none()
